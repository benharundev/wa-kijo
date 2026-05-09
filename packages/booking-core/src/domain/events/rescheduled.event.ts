import { z } from 'zod';

export const RescheduledEvent = {
  name: 'booking-core.rescheduled' as const,
  schema: z.object({
    schedulableId: z.string(),
    resourceId: z.string(),
    moduleSlug: z.string(),
    previousRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    newRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type RescheduledPayload = z.infer<typeof RescheduledEvent.schema>;
