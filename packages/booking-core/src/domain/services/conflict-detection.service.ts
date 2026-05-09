import type { Schedulable } from '../schedulable.interface';
import { ConflictError } from '../errors/conflict.error';
import { isTerminal } from '../booking-state';

/**
 * `ConflictDetectionService` — pure domain service. Stateless.
 *
 * Responsibility: given a candidate `Schedulable` and a set of
 * existing `Schedulable`s on the same resource, decide whether the
 * candidate conflicts.
 *
 * Rules:
 * 1. Schedulables on **different** resources never conflict.
 * 2. Terminal-state schedulables (`cancelled`, `completed`) never
 *    conflict — they're historical, not active.
 * 3. The candidate itself is excluded by id (so calling on an update
 *    flow doesn't conflict with the prior version of the same row).
 * 4. Two non-terminal schedulables on the same resource conflict
 *    iff their ranges overlap (closed-open semantics).
 *
 * Capacity > 1 is intentionally NOT handled in v0.1.0. Only resources
 * with implicit capacity = 1 are supported. When property rentals
 * land and we need fungible-pool capacity, ADR-0010 v0.2.0 will
 * extend this service.
 */
export class ConflictDetectionService {
  /**
   * Returns the subset of `existing` that conflicts with `candidate`.
   * Empty array means no conflict.
   */
  findOverlaps(candidate: Schedulable, existing: readonly Schedulable[]): Schedulable[] {
    return existing.filter((other) => this.conflictsWith(candidate, other));
  }

  /**
   * Throws `ConflictError` if `candidate` conflicts with any of
   * `existing`. Use inside use cases to short-circuit the happy path.
   */
  assertNoOverlap(candidate: Schedulable, existing: readonly Schedulable[]): void {
    const overlaps = this.findOverlaps(candidate, existing);
    if (overlaps.length > 0) {
      throw new ConflictError(candidate, overlaps);
    }
  }

  private conflictsWith(candidate: Schedulable, other: Schedulable): boolean {
    if (candidate.id === other.id) return false; // rule 3
    if (candidate.resourceId !== other.resourceId) return false; // rule 1
    if (isTerminal(other.state)) return false; // rule 2
    return candidate.range.overlaps(other.range); // rule 4
  }
}
