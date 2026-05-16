'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Can } from '@/components/can';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { fetcher, ApiError } from '@/lib/fetcher';
import { toast } from '@/hooks/use-toast';

// ── Types from the API (mirrors BillingService.listPlans / getSubscription) ──

type ApiPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string | null;
  limits: string | null;
};

type ApiSubscription = {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: ApiPlan;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  // Whole-number currencies (MYR/USD with no fractional cents in display)
  if (amount % 1 === 0) {
    return `${currency} ${amount.toLocaleString()}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

function parseFeatures(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // Fall through — treat as comma-separated string
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  canceled: 'outline',
  paused: 'secondary',
  incomplete: 'destructive',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const [interval, setIntervalState] = useState<'month' | 'year'>('month');
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Toast on return from Stripe Checkout
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast({
        title: 'Subscription started',
        description:
          "We're processing your payment — your plan will update once Stripe confirms it (usually within seconds).",
      });
    } else if (status === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No charge was made. You can subscribe again any time.',
      });
    }
  }, [searchParams]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => fetcher<ApiPlan[]>('/api/v1/billing/plans'),
  });

  const {
    data: subscription,
    isLoading: subLoading,
    refetch: refetchSub,
  } = useQuery({
    queryKey: ['billing', 'subscription', orgId],
    queryFn: () => fetcher<ApiSubscription | null>('/api/v1/billing/subscription'),
    enabled: !!orgId,
    refetchOnWindowFocus: true, // refetch when user returns from Stripe Checkout
  });

  async function handleSubscribe(plan: ApiPlan) {
    setSubscribingPlanId(plan.id);
    try {
      const origin = window.location.origin;
      const returnUrl = `${origin}/orgs/${orgId}/billing`;

      const result = await fetcher<{ url: string; sessionId: string }>(
        '/api/v1/billing/stripe/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            planId: plan.id,
            interval,
            provider: 'stripe',
            successUrl: `${returnUrl}?status=success`,
            cancelUrl: `${returnUrl}?status=canceled`,
          }),
        },
      );
      window.location.href = result.url;
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to start checkout. Please try again.';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
      setSubscribingPlanId(null);
    }
  }

  async function handleManageBilling() {
    setOpeningPortal(true);
    try {
      const origin = window.location.origin;
      const returnUrl = `${origin}/orgs/${orgId}/billing`;

      const result = await fetcher<{ url: string }>('/api/v1/billing/stripe/portal', {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
      });
      window.location.href = result.url;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to open billing portal. Please try again.';
      toast({ title: 'Portal unavailable', description: message, variant: 'destructive' });
      setOpeningPortal(false);
    }
  }

  // `activeSubscription` is the narrowed form — non-null only when the org is
  // actively subscribed (excludes 'canceled' and 'incomplete' statuses).
  // Using it directly in JSX lets TypeScript narrow naturally.
  const activeSubscription: ApiSubscription | null =
    subscription && subscription.status !== 'canceled' && subscription.status !== 'incomplete'
      ? subscription
      : null;
  const isSubscribed = activeSubscription !== null;

  return (
    <div className="space-y-8" data-testid="billing-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, payment method, and invoices.
        </p>
      </div>

      {/* ── Current subscription ─────────────────────────────────────────── */}
      <Card data-testid="current-subscription">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            {subLoading ? (
              <Badge variant="outline">Loading…</Badge>
            ) : activeSubscription ? (
              <Badge variant={STATUS_VARIANTS[activeSubscription.status] ?? 'outline'}>
                {activeSubscription.status}
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
          {subLoading ? (
            <CardDescription>Checking your subscription…</CardDescription>
          ) : activeSubscription ? (
            <CardDescription>
              You're on the <strong>{activeSubscription.plan.name}</strong> plan, billed{' '}
              {activeSubscription.interval === 'year' ? 'yearly' : 'monthly'}.
            </CardDescription>
          ) : (
            <CardDescription>
              You're on the free tier. Subscribe to a paid plan below to unlock more capacity.
            </CardDescription>
          )}
        </CardHeader>

        {activeSubscription && (
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>
                Current period: {formatDate(activeSubscription.currentPeriodStart)} —{' '}
                {formatDate(activeSubscription.currentPeriodEnd)}
              </span>
            </div>
            {activeSubscription.cancelAt && (
              <p className="text-muted-foreground">
                Cancellation scheduled for {formatDate(activeSubscription.cancelAt)}.
              </p>
            )}
          </CardContent>
        )}

        {activeSubscription && (
          <CardFooter>
            <Can do="billing:manage">
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={openingPortal}
                data-testid="manage-billing-button"
              >
                {openingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening…
                  </>
                ) : (
                  <>
                    Manage billing
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </Can>
          </CardFooter>
        )}
      </Card>

      <Separator />

      {/* ── Plans grid ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {isSubscribed ? 'Change plan' : 'Choose a plan'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? 'Switch plans through the billing portal — use the button above.'
                : 'Pick a plan that fits your team. Billing is handled by Stripe.'}
            </p>
          </div>

          {!isSubscribed && (
            <div
              className="inline-flex rounded-md border bg-muted p-1"
              role="tablist"
              aria-label="Billing interval"
            >
              <button
                type="button"
                role="tab"
                aria-selected={interval === 'month'}
                onClick={() => setIntervalState('month')}
                className={`rounded px-3 py-1 text-sm transition ${
                  interval === 'month'
                    ? 'bg-background shadow-sm font-medium'
                    : 'text-muted-foreground'
                }`}
                data-testid="interval-monthly"
              >
                Monthly
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={interval === 'year'}
                onClick={() => setIntervalState('year')}
                className={`rounded px-3 py-1 text-sm transition ${
                  interval === 'year'
                    ? 'bg-background shadow-sm font-medium'
                    : 'text-muted-foreground'
                }`}
                data-testid="interval-yearly"
              >
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save 2 months
                </Badge>
              </button>
            </div>
          )}
        </div>

        {plansLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading plans…
          </div>
        ) : !plans || plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <p>No plans configured yet.</p>
              <p className="mt-1">
                Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> to create
                the default plans, or create them in the Stripe dashboard and seed them via the
                admin API.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="plans-grid">
            {plans.map((plan) => {
              const price = interval === 'month' ? plan.priceMonthly : plan.priceYearly;
              const features = parseFeatures(plan.features);
              const isCurrentPlan: boolean =
                activeSubscription !== null && activeSubscription.planId === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={isCurrentPlan ? 'border-primary ring-1 ring-primary' : undefined}
                  data-testid={`plan-card-${plan.slug}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      {isCurrentPlan && <Badge variant="default">Current</Badge>}
                    </div>
                    {plan.description && <CardDescription>{plan.description}</CardDescription>}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-3xl font-semibold tracking-tight">
                        {formatPrice(price, plan.currency)}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        /{interval === 'month' ? 'month' : 'year'}
                      </span>
                    </div>

                    {features.length > 0 && (
                      <ul className="space-y-1.5 text-sm">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Can do="billing:manage">
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? 'outline' : 'default'}
                        disabled={
                          isCurrentPlan ||
                          subscribingPlanId !== null ||
                          (isSubscribed && !isCurrentPlan)
                        }
                        onClick={() => handleSubscribe(plan)}
                        data-testid={`subscribe-button-${plan.slug}`}
                      >
                        {subscribingPlanId === plan.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting…
                          </>
                        ) : isCurrentPlan ? (
                          'Current plan'
                        ) : isSubscribed ? (
                          'Use billing portal to switch'
                        ) : (
                          'Subscribe'
                        )}
                      </Button>
                    </Can>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden in production — useful for development. Allows manually
          refreshing the subscription view after a webhook lands. */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => void refetchSub()}
            className="underline hover:no-underline"
          >
            Refresh subscription
          </button>
        </div>
      )}
    </div>
  );
}
