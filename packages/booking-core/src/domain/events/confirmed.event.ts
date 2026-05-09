import { z } from 'zod';

export const ConfirmedEvent = {
  name: 'booking-core.confirmed' as const,
  schema: z.object({
    schedulableId: z.string(),
    resourceId: z.string(),
    moduleSlug: z.string(),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type ConfirmedPayload = z.infer<typeof ConfirmedEvent.schema>;
