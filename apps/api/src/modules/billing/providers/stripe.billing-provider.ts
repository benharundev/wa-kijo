import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { EnvService } from '../../../config/env.service';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionResult,
  PortalSessionResult,
} from '../billing.provider.interface';

/**
 * StripeBillingProvider — Stripe Subscriptions + Customer Portal.
 *
 * Covers international card payments and is the default provider.
 *
 * Webhook events handled (all others are discarded as 'unknown'):
 *   customer.subscription.created  → subscription.created
 *   customer.subscription.updated  → subscription.updated
 *   customer.subscription.deleted  → subscription.deleted
 *   invoice.payment_succeeded       → payment.succeeded
 *   invoice.payment_failed          → payment.failed
 *
 * Required env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * Optional env vars: STRIPE_PUBLISHABLE_KEY (frontend only)
 */
@Injectable()
export class StripeBillingProvider implements BillingProvider {
  readonly providerName = 'stripe' as const;
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeBillingProvider.name);

  constructor(private readonly env: EnvService) {
    const secretKey = env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required to use the Stripe billing provider');
    }
    this.stripe = new Stripe(secretKey, { typescript: true });
  }

  async ensureCustomer(orgId: string, email: string, name: string): Promise<string> {
    // Search for an existing customer tagged with this org before creating a new one.
    const existing = await this.stripe.customers.search({
      query: `metadata['orgId']:'${orgId}'`,
      limit: 1,
    });

    const first = existing.data[0];
    if (first) {
      return first.id;
    }

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { orgId },
    });

    this.logger.log({ customerId: customer.id, orgId }, 'Stripe customer created');
    return customer.id;
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    orgId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId },
      subscription_data: {
        metadata: { orgId },
        trial_period_days: 14,
      },
    });

    this.logger.log({ sessionId: session.id, orgId }, 'Stripe checkout session created');
    // session.url is always present for hosted checkout sessions
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { url: session.url!, sessionId: session.id };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    this.logger.log({ customerId }, 'Stripe portal session created');
    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<BillingWebhookEvent> {
    const webhookSecret = this.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required to verify Stripe webhooks');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      // Keep error message generic — do not leak signing details
      throw new Error(`Stripe webhook verification failed: ${(err as Error).message}`);
    }

    this.logger.log({ eventType: event.type, eventId: event.id }, 'Stripe webhook received');

    const data = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case 'customer.subscription.created':
        return { type: 'subscription.created', data };
      case 'customer.subscription.updated':
        return { type: 'subscription.updated', data };
      case 'customer.subscription.deleted':
        return { type: 'subscription.deleted', data };
      case 'invoice.payment_succeeded':
        return { type: 'payment.succeeded', data };
      case 'invoice.payment_failed':
        return { type: 'payment.failed', data };
      default:
        return { type: 'unknown', data };
    }
  }
}
