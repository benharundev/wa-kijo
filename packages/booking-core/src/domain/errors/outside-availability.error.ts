import type { Schedulable } from '../schedulable.interface';

/**
 * Thrown when a candidate `Schedulable`'s `TimeRange` falls outside
 * the resource's availability rules (e.g. outside working hours, or
 * inside a blackout window).
 */
export class OutsideAvailabilityError extends Error {
  override readonly name = 'OutsideAvailabilityError';

  constructor(
    public readonly candidate: Schedulable,
    public readonly reason: string,
  ) {
    super(
      `Schedulable ${candidate.id} on resource ${candidate.resourceId} ` +
        `is outside availability: ${reason}`,
    );
  }
}
