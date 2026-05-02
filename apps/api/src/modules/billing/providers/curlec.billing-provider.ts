import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { createHmac } from 'node:crypto';
import { EnvService } from '../../../config/env.service';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionResult,
  PortalSessionResult,
} from '../billing.provider.interface';

/**
 * CurlecBillingProvider — Malaysian subscription billing via Curlec (powered by Razorpay).
 *
 * Curlec is a Malaysian payment gateway that runs on Razorpay's infrastructure.
 * It supports recurring debit authorisation (Direct Debit) via Malaysian banks
 * through the Razorpay Subscriptions API.
 *
 * Flow:
 *  1. ensureCustomer()     — creates a Razorpay customer (stores id in Subscription)
 *  2. createCheckoutSession() — creates a Razorpay subscription + returns payment_link URL
 *  3. User approves mandate on Curlec-hosted page
 *  4. Curlec sends webhook → handleWebhook() normalises to BillingWebhookEvent
 *
 * Razorpay webhook signature: HMAC-SHA256(payload, CURLEC_WEBHOOK_SECRET)
 *
 * Required env vars:
 *   CURLEC_KEY_ID, CURLEC_KEY_SECRET, CURLEC_WEBHOOK_SECRET
 *
 * Optional env vars:
 *   CURLEC_PLAN_ID — Razorpay plan ID to subscribe customers to (used when
 *   a specific plan isn't passed via priceId in createCheckoutSession)
 *
 * Reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/
 */
@Injectable()
export class CurlecBillingProvider implements BillingProvider {
  readonly providerName = 'curlec' as const;
  private readonly logger = new Logger(CurlecBillingProvider.name);
  private readonly razorpay: Razorpay;
  private readonly webhookSecret: string;

  constructor(private readonly env: EnvService) {
    const keyId = env.get('CURLEC_KEY_ID');
    const keySecret = env.get('CURLEC_KEY_SECRET');
    const webhookSecret = env.get('CURLEC_WEBHOOK_SECRET');

    if (!keyId || !keySecret || !webhookSecret) {
      throw new Error(
        'CURLEC_KEY_ID, CURLEC_KEY_SECRET, and CURLEC_WEBHOOK_SECRET are required for Curlec',
      );
    }

    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    this.webhookSecret = webhookSecret;
  }

  async ensureCustomer(orgId: string, email: string, name: string): Promise<string> {
    // Razorpay doesn't have a server-side customer search by metadata,
    // so we create a new customer on each checkout and rely on the Subscription
    // table's stripeCustomerId column (reused as curlecCustomerId here) to cache it.
    const customer = await (this.razorpay.customers as unknown as {
      create: (opts: Record<string, unknown>) => Promise<{ id: string }>;
    }).create({
      email,
      name,
      notes: { orgId },
    });

    this.logger.log({ customerId: customer.id, orgId }, 'Curlec customer created');
    return customer.id;
  }

  async createCheckoutSession(
    customerId: string,
    planId: string,
    orgId: string,
    successUrl: string,
    cancelUrl: string,
    email?: string,
  ): Promise<CheckoutSessionResult> {
    // Create a Razorpay subscription and return the short_url as the hosted payment page.
    const subscription = await (this.razorpay.subscriptions as unknown as {
      create: (opts: Record<string, unknown>) => Promise<{ id: string; short_url: string }>;
    }).create({
      plan_id: planId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // 10 years — effectively open-ended until cancelled
      addons: [],
      customer: { id: customerId, email, contact: '' },
      notes: { orgId },
      notify_info: {
        notify_phone: '',
        notify_email: email ?? '',
      },
      // Razorpay subscription callbacks are handled via dashboard webhook config.
      // successUrl and cancelUrl are used for redirect after hosted checkout.
    });

    this.logger.log(
      { subscriptionId: subscription.id, orgId },
      'Curlec subscription created',
    );

    return { url: subscription.short_url, sessionId: subscription.id };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    // Razorpay / Curlec doesn't have a customer portal.
    // Return the app's own billing management page.
    void customerId;
    return { url: returnUrl };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<BillingWebhookEvent> {
    // Razorpay signature: X-Razorpay-Signature = HMAC-SHA256(raw_body, webhook_secret)
    const expectedSig = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) {
      throw new Error('Invalid Curlec/Razorpay webhook signature');
    }

    // Payload is JSON for Razorpay webhooks
    const event = JSON.parse(payload.toString('utf8')) as {
      event: string;
      payload: Record<string, unknown>;
    };

    this.logger.log({ eventType: event.event }, 'Curlec webhook received');

    const data = event.payload;

    switch (event.event) {
      case 'subscription.activated':
        return { type: 'subscription.created', data };
      case 'subscription.updated':
      case 'subscription.pending':
        return { type: 'subscription.updated', data };
      case 'subscription.cancelled':
      case 'subscription.completed':
        return { type: 'subscription.deleted', data };
      case 'payment.captured':
      case 'subscription.charged':
        return { type: 'payment.succeeded', data };
      case 'payment.failed':
        return { type: 'payment.failed', data };
      default:
        return { type: 'unknown', data };
    }
  }
}
