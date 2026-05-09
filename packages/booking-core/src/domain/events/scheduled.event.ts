import { z } from 'zod';

/**
 * `booking-core.scheduled` — emitted when a `Schedulable` first
 * enters `requested` state. Universal across consumer modules.
 *
 * Per ADR-0009, events are objects with a stable `name` and a Zod
 * `schema`. Consumer subscribers re-validate the payload before
 * processing. Versioning rules in ADR-0008 § "Versioning".
 */
export const ScheduledEvent = {
  name: 'booking-core.scheduled' as const,
  schema: z.object({
    schedulableId: z.string(),
    resourceId: z.string(),
    moduleSlug: z.string(), // emitting module's slug, e.g. 'tournament' or 'workshop'
    range: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type ScheduledPayload = z.infer<typeof ScheduledEvent.schema>;
