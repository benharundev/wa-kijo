import { z } from 'zod';

export const CompletedEvent = {
  name: 'booking-core.completed' as const,
  schema: z.object({
    schedulableId: z.string(),
    resourceId: z.string(),
    moduleSlug: z.string(),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type CompletedPayload = z.infer<typeof CompletedEvent.schema>;
