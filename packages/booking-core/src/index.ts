/**
 * `@wa-kijo/booking-core` — shared scheduling kernel.
 *
 * Public surface. Anything not re-exported here is package-internal
 * and not part of the kernel's API contract.
 *
 * See `docs/decisions/0010-booking-core-kernel.md` for what belongs
 * inside this package and the dual-consumer rule that gates additions.
 */

// ── Value objects ─────────────────────────────────────────────────────────
export { TimeRange, TimeRangeError } from './domain/time-range.vo';

// ── Domain types ──────────────────────────────────────────────────────────
export {
  BOOKING_STATES,
  type BookingState,
  canTransition,
  assertTransition,
  isTerminal,
  InvalidStateTransitionError,
} from './domain/booking-state';
export type { Resource } from './domain/resource.interface';
export type { Schedulable } from './domain/schedulable.interface';
export type {
  AvailabilityRule,
  WorkingHoursRule,
  BlackoutRule,
  DayOfWeek,
  ClockTime,
} from './domain/availability-rule';

// ── Domain services ───────────────────────────────────────────────────────
export { ConflictDetectionService } from './domain/services/conflict-detection.service';
export { AvailabilityCheckService } from './domain/services/availability-check.service';

// ── Domain errors ─────────────────────────────────────────────────────────
export { ConflictError } from './domain/errors/conflict.error';
export { OutsideAvailabilityError } from './domain/errors/outside-availability.error';

// ── Domain events ─────────────────────────────────────────────────────────
export { ScheduledEvent, type ScheduledPayload } from './domain/events/scheduled.event';
export { ConfirmedEvent, type ConfirmedPayload } from './domain/events/confirmed.event';
export { CancelledEvent, type CancelledPayload } from './domain/events/cancelled.event';
export { RescheduledEvent, type RescheduledPayload } from './domain/events/rescheduled.event';
export { CompletedEvent, type CompletedPayload } from './domain/events/completed.event';

// ── Application ports ─────────────────────────────────────────────────────
export type { SchedulableRepositoryPort } from './application/ports/schedulable-repository.port';
export type { DomainEventPublisherPort } from './application/ports/domain-event-publisher.port';
