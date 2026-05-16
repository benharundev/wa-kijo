import { z } from 'zod';

export const EnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api/v1'),

  // Database — required, no default
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  SENTRY_DSN: z.string().optional(),

  // Phase 3 — Better Auth (required)
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Phase 3 — Email (required)
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().email(),

  // Phase 3 — OAuth providers (optional — app must not crash when absent)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Phase 5 — Billing: Stripe (optional — app must not crash when absent)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Phase 5 — Billing: Billplz (optional)
  BILLPLZ_API_KEY: z.string().optional(),
  BILLPLZ_X_SIGNATURE_KEY: z.string().optional(),
  BILLPLZ_COLLECTION_ID: z.string().optional(),

  // Phase 5 — Billing: Curlec / Razorpay Malaysia (optional)
  CURLEC_KEY_ID: z.string().optional(),
  CURLEC_KEY_SECRET: z.string().optional(),
  CURLEC_WEBHOOK_SECRET: z.string().optional(),

  // Phase 5 — Queue admin board (optional — unprotected if absent)
  BULL_BOARD_USERNAME: z.string().default('admin'),
  BULL_BOARD_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
