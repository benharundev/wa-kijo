import { z } from 'zod';

// ── Checkout ──────────────────────────────────────────────────────────────────

export const CreateCheckoutSchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(['month', 'year']).default('month'),
  provider: z.enum(['stripe', 'billplz', 'curlec']).default('stripe'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  /**
   * Required for Billplz — the bill is tied to a payer email address.
   * Optional for Stripe (Stripe checkout collects email during the session).
   */
  email: z.string().email().optional(),
});
export type CreateCheckoutDto = z.infer<typeof CreateCheckoutSchema>;

// ── Portal ────────────────────────────────────────────────────────────────────

export const CreatePortalSchema = z.object({
  returnUrl: z.string().url(),
});
export type CreatePortalDto = z.infer<typeof CreatePortalSchema>;

// ── Subscription status ───────────────────────────────────────────────────────

export const SubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
  'incomplete',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const BillingIntervalSchema = z.enum(['month', 'year']);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const BillingProviderSchema = z.enum(['stripe', 'billplz', 'curlec']);
export type BillingProviderName = z.infer<typeof BillingProviderSchema>;
