import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { EnvService } from '../../../config/env.service';
import type {
  BillingProvider,
  BillingWebhookEvent,
  CheckoutSessionResult,
  PortalSessionResult,
} from '../billing.provider.interface';

interface BillplzBillResponse {
  id: string;
  url: string;
  paid: boolean;
  state: string;
  amount: number;
  collection_id: string;
}

/**
 * BillplzBillingProvider — Malaysian FPX / online banking via Billplz.
 *
 * Billplz is a recurring-bill and one-time-payment gateway popular in
 * Malaysia. Unlike Stripe it doesn't have a subscription management concept;
 * each billing cycle creates a new bill and the webhook/callback notifies
 * your server of payment.
 *
 * Webhook signature: HMAC-SHA256 over pipe-joined sorted field values using
 * the X-Signature-Key from your Billplz account settings.
 *
 * Required env vars:
 *   BILLPLZ_API_KEY, BILLPLZ_X_SIGNATURE_KEY, BILLPLZ_COLLECTION_ID
 *
 * Sandbox vs production is determined by NODE_ENV. Billplz sandbox base URL:
 *   https://www.billplz-sandbox.com/api/v3
 */
@Injectable()
export class BillplzBillingProvider implements BillingProvider {
  readonly providerName = 'billplz' as const;
  private readonly logger = new Logger(BillplzBillingProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly collectionId: string;
  private readonly xSignatureKey: string;

  constructor(private readonly env: EnvService) {
    const apiKey = env.get('BILLPLZ_API_KEY');
    const collectionId = env.get('BILLPLZ_COLLECTION_ID');
    const xSignatureKey = env.get('BILLPLZ_X_SIGNATURE_KEY');

    if (!apiKey || !collectionId || !xSignatureKey) {
      throw new Error(
        'BILLPLZ_API_KEY, BILLPLZ_COLLECTION_ID, and BILLPLZ_X_SIGNATURE_KEY are required for Billplz',
      );
    }

    this.apiKey = apiKey;
    this.collectionId = collectionId;
    this.xSignatureKey = xSignatureKey;
    this.baseUrl =
      env.get('NODE_ENV') === 'production'
        ? 'https://www.billplz.com/api/v3'
        : 'https://www.billplz-sandbox.com/api/v3';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const credentials = Buffer.from(`${this.apiKey}:`).toString('base64');
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Billplz API error ${String(response.status)}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async ensureCustomer(orgId: string): Promise<string> {
    // Billplz does not have a customer entity — bills are standalone.
    // Return orgId as a pseudo-customerId so the interface is consistent.
    return orgId;
  }

  async createCheckoutSession(
    _customerId: string,
    amountCents: string,
    orgId: string,
    successUrl: string,
    _cancelUrl: string,
    email?: string,
  ): Promise<CheckoutSessionResult> {
    if (!email) {
      throw new Error('email is required for Billplz bill creation');
    }

    const bill = await this.request<BillplzBillResponse>('/bills', {
      method: 'POST',
      body: JSON.stringify({
        collection_id: this.collectionId,
        email,
        name: `Subscription payment`,
        amount: amountCents, // Billplz expects cents as integer string
        callback_url: `${successUrl.replace(/\/$/, '')}/billing/billplz/webhook`,
        redirect_url: successUrl,
        description: 'wa\u2019kijo SaaS subscription',
        reference_1_label: 'orgId',
        reference_1: orgId,
      }),
    });

    this.logger.log({ billId: bill.id, orgId }, 'Billplz bill created');
    return { url: bill.url, sessionId: bill.id };
  }

  async createPortalSession(_customerId: string, returnUrl: string): Promise<PortalSessionResult> {
    // Billplz has no billing portal — return the app's own billing page.
    return { url: returnUrl };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<BillingWebhookEvent> {
    const params = new URLSearchParams(payload.toString('utf8'));

    // Billplz signature: HMAC-SHA256 of pipe-separated sorted `key + value` pairs,
    // excluding the x_signature field itself.
    const sortedPairs = [...params.entries()]
      .filter(([key]) => key !== 'x_signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('|');

    const expectedSig = createHmac('sha256', this.xSignatureKey)
      .update(sortedPairs)
      .digest('hex');

    if (signature !== expectedSig) {
      throw new Error('Invalid Billplz webhook signature');
    }

    const paid = params.get('paid') === 'true';
    const data = Object.fromEntries(params.entries());

    this.logger.log({ billId: data['id'], paid }, 'Billplz webhook received');

    return paid
      ? { type: 'payment.succeeded', data }
      : { type: 'payment.failed', data };
  }
}
