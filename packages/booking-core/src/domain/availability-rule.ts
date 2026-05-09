import type { TimeRange } from './time-range.vo';

/**
 * Availability rules describe **when** a resource is open for booking.
 * The kernel ships two rule kinds in v0.1.0:
 *
 * - `WorkingHoursRule` — recurring weekly windows (Mon-Fri 09:00-18:00).
 * - `BlackoutRule` — explicit unavailable ranges (public holidays,
 *   maintenance windows, tournament-organiser breaks).
 *
 * `RecurringSlotRule` is deferred to v0.2.0 per the dual-consumer
 * rule (currently only Workshop wants it; wa'lawe constructs rounds
 * explicitly).
 *
 * A resource's availability is the **intersection** of all
 * `WorkingHoursRule`s minus the **union** of all `BlackoutRule`s.
 * `AvailabilityCheckService` evaluates this against a candidate
 * `TimeRange`.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

/**
 * `HH:MM` 24-hour notation, UTC. Consumer modules convert to/from
 * local time at their boundary.
 */
export type ClockTime = `${number}:${number}`;

export interface WorkingHoursRule {
  readonly kind: 'working-hours';
  readonly daysOfWeek: readonly DayOfWeek[];
  readonly startTime: ClockTime; // inclusive, e.g. '09:00'
  readonly endTime: ClockTime; // exclusive, e.g. '18:00'
}

export interface BlackoutRule {
  readonly kind: 'blackout';
  readonly range: TimeRange;
  readonly reason?: string;
}

export type AvailabilityRule = WorkingHoursRule | BlackoutRule;
