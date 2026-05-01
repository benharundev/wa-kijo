import { z } from 'zod';

export const ServiceStatusSchema = z.enum(['ok', 'degraded', 'down']);
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;

export const HealthResponseSchema = z.object({
  status: ServiceStatusSchema,
  timestamp: z.string().datetime(),
  services: z.object({
    postgres: z.object({ status: ServiceStatusSchema }),
    redis: z.object({ status: ServiceStatusSchema }),
  }),
});

export type HealthResponseDto = z.infer<typeof HealthResponseSchema>;
