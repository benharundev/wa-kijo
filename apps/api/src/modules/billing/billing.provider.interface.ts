/**
 * BillingProvider — contract that every payment gateway must implement.
 *
 * Ships with the Stripe implementation only. The interface is intentionally
 * generic so additional providers (e.g. Billplz for Malaysian FPX, Curlec for
 * direct-debit) can be plugged in later without changing BillingService.
 *
 * The BillingService selects the provider per-request based on
 * CreateCheckoutDto.provider. All providers write to the same Subscription
 * row in Postgres after the user completes payment.
 */
export interface CheckoutSessionResult {
  /** Redirect the user to this URL to complete payment. */
  url: string;
  /** Provider-assigned session or bill ID (used for idempotency). */
  sessionId: string;
}

export interface PortalSessionResult {
  /** Redirect the user to this URL to manage their subscription. */
  url: string;
}

export interface BillingWebhookEvent {
  /**
   * Normalised event type — both providers map to this common vocabulary.
   * 'unknown' events are logged and discarded without error.
   */
  type:
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'unknown';
  /** Raw provider payload for audit logging and debugging. */
  data: Record<string, unknown>;
}

export interface BillingProvider {
  readonly providerName: 'stripe' | 'billplz' | 'curlec';
  // Note: union kept open so additional providers can be added without
  // diverging the interface. Only 'stripe' is wired in by default.

  /**
   * Find or create a customer record in the provider for this organisation.
   * Returns the provider-assigned customerId (stored in Subscription table).
   */
  ensureCustomer(orgId: string, email: string, name: string): Promise<string>;

  /**
   * Create a hosted checkout session.
   * @param customerId - provider customer ID from ensureCustomer()
   * @param priceId    - provider price / plan ID (Stripe price ID or Billplz amount)
   * @param orgId      - passed as metadata so webhooks can correlate back to the org
   * @param successUrl - where to redirect after successful payment
   * @param cancelUrl  - where to redirect on cancellation (Stripe only)
   * @param email      - payer email (required by Billplz)
   */
  createCheckoutSession(
    customerId: string,
    priceId: string,
    orgId: string,
    successUrl: string,
    cancelUrl: string,
    email?: string,
  ): Promise<CheckoutSessionResult>;

  /**
   * Create a billing portal / account management session.
   * Billplz returns the returnUrl unchanged (no portal concept).
   */
  createPortalSession(customerId: string, returnUrl: string): Promise<PortalSessionResult>;

  /**
   * Verify and parse an inbound webhook payload.
   * Throws if the signature is invalid — the controller returns 400 silently
   * (no detail in the response body — do not help attackers debug the signature).
   */
  handleWebhook(payload: Buffer, signature: string): Promise<BillingWebhookEvent>;
}

export const BILLING_STRIPE_PROVIDER = Symbol('BILLING_STRIPE_PROVIDER');
// Add additional provider tokens here when wiring in more BillingProvider
// implementations (Billplz, Curlec, etc.).
