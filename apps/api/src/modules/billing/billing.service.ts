import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CreateCheckoutDto, CreatePortalDto } from '@wa-kijo/shared';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BILLING_STRIPE_PROVIDER,
  type BillingProvider,
  type BillingWebhookEvent,
} from './billing.provider.interface';

/**
 * BillingService — business logic for subscription lifecycle management.
 *
 * Provider selection:
 *  Community ships with Stripe only. The provider is selected per-request
 *  via CreateCheckoutDto.provider, kept as a string so wa'kijo-pro can add
 *  more providers without changing this contract. If the requested provider
 *  is not configured, a BadRequestException is thrown before any external
 *  call is made.
 *
 * Subscription persistence:
 *  A single Subscription row per org tracks the current plan, status, and
 *  provider-specific IDs. Webhook handlers upsert this row on every event.
 *
 * Idempotency:
 *  Webhook handlers check the provider subscription ID before writing to
 *  prevent duplicate processing. Providers are expected to retry on 5xx.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BILLING_STRIPE_PROVIDER)
    private readonly stripeProvider: BillingProvider | null,
  ) {}

  // ── Plans ─────────────────────────────────────────────────────────────────

  async listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        features: true,
        limits: true,
      },
    });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  async getSubscription(ctx: RequestContext) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
      include: { plan: true },
    });
    return sub ?? null;
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  async createCheckout(ctx: RequestContext, dto: CreateCheckoutDto) {
    const provider = this.getProvider(dto.provider);
    const plan = await this.getPlan(dto.planId);

    // Community ships Stripe only — additional provider price ID resolution
    // lives in wa'kijo-pro. Reject non-Stripe providers explicitly.
    if (dto.provider !== 'stripe') {
      throw new BadRequestException(
        `Billing provider '${dto.provider}' is not available in wa'kijo Community. Stripe is the only supported provider; additional providers (Billplz, Curlec) require wa'kijo Pro or higher.`,
      );
    }

    const priceId =
      dto.interval === 'month'
        ? (plan.stripePriceMonthlyId ?? '')
        : (plan.stripePriceYearlyId ?? '');

    if (!priceId) {
      throw new BadRequestException(
        `Plan '${plan.slug}' has no Stripe price configured for ${dto.interval}ly billing`,
      );
    }

    // Get the org to resolve the owner's email/name for the provider
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: {
        name: true,
        members: { where: { role: 'owner' }, include: { user: true }, take: 1 },
      },
    });

    const ownerEmail = dto.email ?? org.members[0]?.user.email ?? '';
    const customerId = await provider.ensureCustomer(ctx.orgId, ownerEmail, org.name);

    const result = await provider.createCheckoutSession(
      customerId,
      priceId,
      ctx.orgId,
      dto.successUrl,
      dto.cancelUrl ?? dto.successUrl,
      ownerEmail,
    );

    this.logger.log(
      { orgId: ctx.orgId, provider: dto.provider, planId: plan.id, sessionId: result.sessionId },
      'Checkout session created',
    );

    return result;
  }

  // ── Portal ────────────────────────────────────────────────────────────────

  async createPortal(ctx: RequestContext, dto: CreatePortalDto) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: ctx.orgId },
    });

    if (!sub) {
      throw new NotFoundException('No active subscription found for this organisation');
    }

    if (!sub.stripeCustomerId) {
      throw new BadRequestException(
        "No Stripe customer ID on this subscription. wa'kijo Community only supports the Stripe Customer Portal.",
      );
    }

    const provider = this.getProvider('stripe');
    return provider.createPortalSession(sub.stripeCustomerId, dto.returnUrl);
  }

  // ── Webhook handlers ──────────────────────────────────────────────────────

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = this.getProvider('stripe');
    const event = await provider.handleWebhook(payload, signature);
    await this.processWebhookEvent('stripe', event);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private getProvider(name: string): BillingProvider {
    if (name !== 'stripe') {
      throw new BadRequestException(
        `Billing provider '${name}' is not available in wa'kijo Community. Additional providers (Billplz, Curlec, etc.) require wa'kijo Pro or higher.`,
      );
    }
    if (!this.stripeProvider) {
      throw new BadRequestException(
        `Stripe is not configured. Set STRIPE_SECRET_KEY in your .env file.`,
      );
    }
    return this.stripeProvider;
  }

  private async processWebhookEvent(
    providerName: string,
    event: BillingWebhookEvent,
  ): Promise<void> {
    if (event.type === 'unknown') {
      this.logger.log({ providerName, eventType: 'unknown' }, 'Billing webhook ignored');
      return;
    }

    this.logger.log({ providerName, eventType: event.type }, 'Processing billing webhook');

    // Extract provider-specific IDs from the raw payload
    const data = event.data;

    if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
      await this.upsertSubscription(providerName, data);
    } else if (event.type === 'subscription.deleted') {
      await this.cancelSubscription(providerName, data);
    } else if (event.type === 'payment.succeeded') {
      await this.handlePaymentSucceeded(providerName, data);
    } else if (event.type === 'payment.failed') {
      await this.handlePaymentFailed(providerName, data);
    }
  }

  private async upsertSubscription(
    providerName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    // Extract orgId from metadata (set when creating checkout session)
    const orgId = this.extractOrgId(providerName, data);
    if (!orgId) {
      this.logger.warn({ providerName }, 'Webhook missing orgId metadata — skipping upsert');
      return;
    }

    const stripeSubId = String(data['id'] ?? '');
    const stripeCustomerId = String(data['customer'] ?? '');
    const status = this.normaliseStatus(providerName, data);
    const now = new Date();
    const periodEnd = new Date((data['current_period_end'] as number) * 1000);

    await this.prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId: await this.resolvePlanId(providerName, data),
        status,
        interval: 'month',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId,
      },
      update: {
        status,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId: stripeSubId || undefined,
        stripeCustomerId: stripeCustomerId || undefined,
      },
    });

    this.logger.log({ orgId, status }, 'Subscription upserted from webhook');
  }

  private async cancelSubscription(
    providerName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const orgId = this.extractOrgId(providerName, data);
    if (!orgId) return;

    await this.prisma.subscription.updateMany({
      where: { organizationId: orgId },
      data: { status: 'canceled', canceledAt: new Date() },
    });

    this.logger.log({ orgId }, 'Subscription cancelled from webhook');
  }

  private async handlePaymentSucceeded(
    providerName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const orgId = this.extractOrgId(providerName, data);
    if (!orgId) return;

    await this.prisma.subscription.updateMany({
      where: { organizationId: orgId },
      data: { status: 'active' },
    });

    this.logger.log({ orgId }, 'Payment succeeded — subscription active');
  }

  private async handlePaymentFailed(
    providerName: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const orgId = this.extractOrgId(providerName, data);
    if (!orgId) return;

    await this.prisma.subscription.updateMany({
      where: { organizationId: orgId },
      data: { status: 'past_due' },
    });

    this.logger.warn({ orgId }, 'Payment failed — subscription marked past_due');
  }

  private extractOrgId(_providerName: string, data: Record<string, unknown>): string | null {
    // Stripe — orgId set as metadata at checkout-session creation.
    const metadata = data['metadata'] as Record<string, string> | undefined;
    return metadata?.['orgId'] ?? null;
  }

  private normaliseStatus(_providerName: string, data: Record<string, unknown>): string {
    const map: Record<string, string> = {
      trialing: 'trialing',
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      incomplete: 'incomplete',
      paused: 'paused',
    };
    return map[String(data['status'] ?? '')] ?? 'active';
  }

  private async resolvePlanId(
    _providerName: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    // Try to find the matching plan by Stripe price ID
    const stripePriceId = String(
      ((data['items'] as Record<string, unknown> | undefined)?.['data'] as unknown[])?.[0]
        ? (
            ((data['items'] as Record<string, unknown>)?.['data'] as unknown[])?.[0] as Record<
              string,
              unknown
            >
          )?.['price']
        : '',
    );

    if (stripePriceId) {
      const plan = await this.prisma.plan.findFirst({
        where: {
          OR: [{ stripePriceMonthlyId: stripePriceId }, { stripePriceYearlyId: stripePriceId }],
        },
      });
      if (plan) return plan.id;
    }

    // Fallback: use the first active plan
    const fallback = await this.prisma.plan.findFirst({ where: { isActive: true } });
    return fallback?.id ?? '';
  }
}
