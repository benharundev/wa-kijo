import { z } from 'zod';

/**
 * Domain event emitted when a new `Example` is created. Fired AFTER
 * the aggregate is persisted; subscribers in other modules consume
 * it via the BullMQ events queue (ADR-0007).
 *
 * Versioning rules per ADR-0008/0009:
 * - Add an optional field → minor bump.
 * - Add a required field, rename, or remove → major bump.
 */
export const ExampleCreatedEvent = {
  name: 'template.example.created' as const,
  schema: z.object({
    exampleId: z.string(),
    organizationId: z.string(),
    title: z.string(),
    occurredAt: z.string().datetime(),
  }),
} as const;

export type ExampleCreatedPayload = z.infer<typeof ExampleCreatedEvent.schema>;
