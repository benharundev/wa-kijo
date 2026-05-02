import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CreateCheckoutDto, CreatePortalDto } from '@wa-kijo/shared';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BILLING_BILLPLZ_PROVIDER,
  BILLING_CURLEC_PROVIDER,
  BILLING_STRIPE_PROVIDER,
  type BillingProvider,
  type BillingWebhookEvent,
} from './billing.provider.interface';

/**
 * BillingService — business logic for subscription lifecycle management.
 *
 * Provider selection:
 *  The service holds three optional providers (Stripe, Billplz, Curlec).
 *  The provider is selected per-request via CreateCheckoutDto.provider.
 *  If the requested provider is not configured (missing env vars), a
 *  BadRequestException is thrown before any external call is made.
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
    @Inject(BILLING_BILLPLZ_PROVIDER)
    private readonly billplzProvider: BillingProvider | null,
    @Inject(BILLING_CURLEC_PROVIDER)
    private readonly curlecProvider: BillingProvider | null,
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

    // Resolve the provider price/plan ID based on interval
    const priceId =
      dto.provider === 'stripe'
        ? dto.interval === 'month'
          ? (plan.stripePriceMonthlyId ?? '')
          : (plan.stripePriceYearlyId ?? '')
        : dto.provider === 'curlec'
          ? (plan.curlecPlanId ?? '')
          : String(dto.interval === 'month' ? plan.priceMonthly : plan.priceYearly);

    if (!priceId) {
      throw new BadRequestException(
        `Plan '${plan.slug}' has no ${dto.provider} price configured for ${dto.interval}ly billing`,
      );
    }

    // Get the org to resolve the owner's email/name for the provider
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { name: true, members: { where: { role: 'owner' }, include: { user: true }, take: 1 } },
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

    // Determine provider from the stored subscription
    const providerName = sub.stripeCustomerId
      ? 'stripe'
      : sub.billplzBillId
        ? 'billplz'
        : 'curlec';

    const provider = this.getProvider(providerName);
    const customerId =
      sub.stripeCustomerId ?? sub.curlecCustomerId ?? ctx.orgId;

    return provider.createPortalSession(customerId, dto.returnUrl);
  }

  // ── Webhook handlers ──────────────────────────────────────────────────────

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = this.getProvider('stripe');
    const event = await provider.handleWebhook(payload, signature);
    await this.processWebhookEvent('stripe', event);
  }

  async handleBillplzWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = this.getProvider('billplz');
    const event = await provider.handleWebhook(payload, signature);
    await this.processWebhookEvent('billplz', event);
  }

  async handleCurlecWebhook(payload: Buffer, signature: string): Promise<void> {
    const provider = this.getProvider('curlec');
    const event = await provider.handleWebhook(payload, signature);
    await this.processWebhookEvent('curlec', event);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private getProvider(name: string): BillingProvider {
    const provider =
      name === 'stripe'
        ? this.stripeProvider
        : name === 'billplz'
          ? this.billplzProvider
          : name === 'curlec'
            ? this.curlecProvider
            : null;

    if (!provider) {
      throw new BadRequestException(
        `Billing provider '${name}' is not configured. Check the corresponding env vars.`,
      );
    }

    return provider;
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

    const stripeSubId = providerName === 'stripe' ? String(data['id'] ?? '') : undefined;
    const stripeCustomerId =
      providerName === 'stripe' ? String(data['customer'] ?? '') : undefined;
    const curlecSubId = providerName === 'curlec'
      ? String((data['subscription'] as Record<string, unknown> | undefined)?.['entity'] ?? '')
      : undefined;

    const status = this.normaliseStatus(providerName, data);
    const now = new Date();
    const periodEnd = providerName === 'stripe'
      ? new Date((data['current_period_end'] as number) * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Billplz/Curlec: +30 days

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
        curlecSubscriptionId: curlecSubId,
      },
      update: {
        status,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId: stripeSubId ?? undefined,
        stripeCustomerId: stripeCustomerId ?? undefined,
        curlecSubscriptionId: curlecSubId ?? undefined,
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

  private extractOrgId(
    providerName: string,
    data: Record<string, unknown>,
  ): string | null {
    if (providerName === 'stripe') {
      const metadata = data['metadata'] as Record<string, string> | undefined;
      return metadata?.['orgId'] ?? null;
    }
    if (providerName === 'billplz') {
      return String(data['reference_1'] ?? '') || null;
    }
    if (providerName === 'curlec') {
      const notes = (data['subscription'] as Record<string, unknown> | undefined)?.['notes'] as
        | Record<string, string>
        | undefined;
      return notes?.['orgId'] ?? null;
    }
    return null;
  }

  private normaliseStatus(providerName: string, data: Record<string, unknown>): string {
    if (providerName === 'stripe') {
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
    return 'active';
  }

  private async resolvePlanId(
    _providerName: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    // Try to find the matching plan by Stripe price ID
    const stripePriceId = String(
      ((data['items'] as Record<string, unknown> | undefined)?.['data'] as unknown[])?.[0]
        ? (((data['items'] as Record<string, unknown>)?.['data'] as unknown[])?.[0] as
            Record<string, unknown>)?.['price']
        : '',
    );

    if (stripePriceId) {
      const plan = await this.prisma.plan.findFirst({
        where: {
          OR: [
            { stripePriceMonthlyId: stripePriceId },
            { stripePriceYearlyId: stripePriceId },
          ],
        },
      });
      if (plan) return plan.id;
    }

    // Fallback: use the first active plan
    const fallback = await this.prisma.plan.findFirst({ where: { isActive: true } });
    return fallback?.id ?? '';
  }
}
