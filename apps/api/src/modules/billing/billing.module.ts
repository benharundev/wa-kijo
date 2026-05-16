import { Module } from '@nestjs/common';
import { EnvService } from '../../config/env.service';
import { BILLING_STRIPE_PROVIDER } from './billing.provider.interface';
import { StripeBillingProvider } from './providers/stripe.billing-provider';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

/**
 * BillingModule — subscription management via Stripe.
 *
 * The BillingProvider interface is intentionally kept generic so that
 * additional providers (Billplz, Curlec, etc.) can be added later without
 * changing the BillingService contract.
 *
 * Provider initialisation is lazy via useFactory: if the required env vars
 * are absent the factory returns null instead of throwing, so the app boots
 * without billing credentials. BillingService.getProvider() throws a
 * 400 BadRequestException at call time if Stripe was requested but not
 * configured — preventing silent misconfiguration.
 *
 * Routes:
 *   POST /billing/stripe/checkout
 *   POST /billing/stripe/portal
 *   POST /billing/stripe/webhook   (Public — signature-verified)
 */
@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      provide: BILLING_STRIPE_PROVIDER,
      inject: [EnvService],
      useFactory: (env: EnvService): StripeBillingProvider | null => {
        if (!env.get('STRIPE_SECRET_KEY')) return null;
        try {
          return new StripeBillingProvider(env);
        } catch {
          return null;
        }
      },
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
