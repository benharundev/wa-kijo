import type { z } from 'zod';

/**
 * Port: an event-publisher abstraction. Consumer modules implement
 * this on top of BullMQ (per ADR-0007) so the kernel can emit events
 * without knowing about queues or job APIs.
 *
 * `event` is the event descriptor — an object with a stable string
 * `name` and a Zod `schema`. The publisher is expected to validate
 * `payload` against `schema` before queueing (defence in depth — the
 * caller already produced a typed payload, but explicit validation
 * catches drift across module boundaries).
 */
export interface DomainEventPublisherPort {
  publish<S extends z.ZodTypeAny>(
    event: { readonly name: string; readonly schema: S },
    payload: z.input<S>,
  ): Promise<void>;
}
