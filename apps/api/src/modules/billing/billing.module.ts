import { Module } from '@nestjs/common';
import { EnvService } from '../../config/env.service';
import {
  BILLING_BILLPLZ_PROVIDER,
  BILLING_CURLEC_PROVIDER,
  BILLING_STRIPE_PROVIDER,
} from './billing.provider.interface';
import { StripeBillingProvider } from './providers/stripe.billing-provider';
import { BillplzBillingProvider } from './providers/billplz.billing-provider';
import { CurlecBillingProvider } from './providers/curlec.billing-provider';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

/**
 * BillingModule — subscription management via Stripe, Billplz, and Curlec.
 *
 * Provider initialisation is lazy via useFactory: if the required env vars are
 * absent the factory returns null instead of throwing, so the app boots without
 * billing credentials. The BillingService.getProvider() method throws a
 * 400 BadRequestException at call time if a provider was requested but not
 * configured — preventing silent misconfiguration.
 *
 * Controllers for each provider use distinct routes:
 *   POST /billing/stripe/checkout    POST /billing/stripe/webhook
 *   POST /billing/billplz/checkout   POST /billing/billplz/webhook
 *   POST /billing/curlec/checkout    POST /billing/curlec/webhook
 *
 * Webhook routes are @Public() but signature-verified inside the service.
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
    {
      provide: BILLING_BILLPLZ_PROVIDER,
      inject: [EnvService],
      useFactory: (env: EnvService): BillplzBillingProvider | null => {
        if (!env.get('BILLPLZ_API_KEY')) return null;
        try {
          return new BillplzBillingProvider(env);
        } catch {
          return null;
        }
      },
    },
    {
      provide: BILLING_CURLEC_PROVIDER,
      inject: [EnvService],
      useFactory: (env: EnvService): CurlecBillingProvider | null => {
        if (!env.get('CURLEC_KEY_ID')) return null;
        try {
          return new CurlecBillingProvider(env);
        } catch {
          return null;
        }
      },
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
