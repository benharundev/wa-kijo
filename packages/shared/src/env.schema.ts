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
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('debug'),
  SENTRY_DSN: z.string().optional(),

  // Phase 3 — Better Auth (optional until Phase 3)
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().optional(),

  // Phase 3 — Email (optional until Phase 3)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Phase 4 — Billing (optional until Phase 4)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  BILLPLZ_API_KEY: z.string().optional(),
  BILLPLZ_X_SIGNATURE_KEY: z.string().optional(),
  BILLPLZ_COLLECTION_ID: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
