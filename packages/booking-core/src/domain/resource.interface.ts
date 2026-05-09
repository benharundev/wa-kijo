/**
 * A `Resource` is anything a `Schedulable` can be bound to.
 *
 * Examples per consumer:
 * - wa'lawe: a board (tournament table), a player.
 * - Workshop: a service bay, a mechanic.
 * - Property rental: a unit (apartment, room).
 *
 * The kernel deliberately keeps this interface tiny — `id` and
 * optional `capacity` only. Anything richer (skills, ratings, hourly
 * rate, photo URL) is module-specific and lives in the consumer's
 * domain layer.
 */
export interface Resource {
  /** Stable identifier; opaque to the kernel. */
  readonly id: string;

  /**
   * Maximum concurrent `Schedulable`s permitted on this resource.
   * `1` is the default — a single bay, board, or unit cannot host
   * two simultaneous bookings. Set higher for resources that can
   * (e.g. a parking lot with N spaces, a pool of fungible units).
   */
  readonly capacity?: number;
}
