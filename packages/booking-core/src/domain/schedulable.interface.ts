import type { BookingState } from './booking-state';
import type { TimeRange } from './time-range.vo';

/**
 * A `Schedulable` is anything that occupies a `Resource` for a
 * `TimeRange`. Consumer modules implement this interface on their
 * own aggregate roots; the kernel reasons over `Schedulable`s
 * abstractly.
 *
 * Examples per consumer:
 * - wa'lawe: a `Pairing` (one game in one round on one board).
 * - Workshop: a `ServiceAppointment` (one job on one bay with one
 *   mechanic).
 * - Property rental: a `Stay` (one booking of one unit).
 *
 * The kernel does NOT mutate `Schedulable`s — consumer aggregates own
 * their own state transitions. The kernel reads (`overlaps`,
 * `isAvailable`) and produces decisions; the consumer applies them.
 */
export interface Schedulable {
  readonly id: string;
  readonly resourceId: string;
  readonly range: TimeRange;
  readonly state: BookingState;
}
