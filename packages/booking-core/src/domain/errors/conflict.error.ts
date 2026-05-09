import type { Schedulable } from '../schedulable.interface';

/**
 * Thrown when a candidate `Schedulable` would overlap an existing
 * confirmed `Schedulable` on the same resource.
 *
 * Consumer modules catch this in their use cases and translate to
 * the appropriate HTTP error (typically `409 CONFLICT` per
 * `docs/api-conventions.md` § 4).
 */
export class ConflictError extends Error {
  override readonly name = 'ConflictError';

  constructor(
    public readonly candidate: Schedulable,
    public readonly existing: Schedulable[],
  ) {
    super(
      `Schedulable ${candidate.id} on resource ${candidate.resourceId} ` +
        `conflicts with ${existing.length} existing booking(s)`,
    );
  }
}
