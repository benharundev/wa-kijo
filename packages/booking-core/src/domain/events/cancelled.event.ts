import { z } from 'zod';

export const CancelledEvent = {
  name: 'booking-core.cancelled' as const,
  schema: z.object({
    schedulableId: z.string(),
    resourceId: z.string(),
    moduleSlug: z.string(),
    reason: z.string().optional(),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type CancelledPayload = z.infer<typeof CancelledEvent.schema>;
