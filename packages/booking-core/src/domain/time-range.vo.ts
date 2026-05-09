/**
 * `TimeRange` — closed-open half-interval `[start, end)`.
 *
 * Universal value object: every consumer of `@wa-kijo/booking-core`
 * reasons about start/end times. Immutable, equality by value.
 *
 * Closed-open semantics (`start` inclusive, `end` exclusive) avoid
 * the off-by-one ambiguity that bites systems using closed-closed
 * intervals: a 10:00–11:00 booking and an 11:00–12:00 booking do
 * NOT overlap, which matches every booking-system user's intuition.
 */
export class TimeRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  /**
   * Construct a `TimeRange`. Throws if `end` is not strictly after
   * `start` — zero-length and reversed ranges are invalid.
   */
  static of(start: Date | string, end: Date | string): TimeRange {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (Number.isNaN(startDate.getTime())) {
      throw new TimeRangeError('start is not a valid date');
    }
    if (Number.isNaN(endDate.getTime())) {
      throw new TimeRangeError('end is not a valid date');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new TimeRangeError('end must be strictly after start');
    }
    return new TimeRange(startDate, endDate);
  }

  /** Length of this range, in whole minutes. */
  durationMinutes(): number {
    return Math.floor((this.end.getTime() - this.start.getTime()) / 60_000);
  }

  /**
   * True iff this range overlaps `other` for any non-zero duration.
   * Closed-open semantics: ranges that merely touch (a.end === b.start)
   * do NOT overlap.
   */
  overlaps(other: TimeRange): boolean {
    return this.start.getTime() < other.end.getTime() && other.start.getTime() < this.end.getTime();
  }

  /** True iff `other` is fully contained within this range. */
  contains(other: TimeRange): boolean {
    return (
      other.start.getTime() >= this.start.getTime() && other.end.getTime() <= this.end.getTime()
    );
  }

  /** Value-equality by start/end timestamps. */
  equals(other: TimeRange): boolean {
    return (
      this.start.getTime() === other.start.getTime() && this.end.getTime() === other.end.getTime()
    );
  }

  /** ISO 8601 representation. Convenient for logs and event payloads. */
  toISO(): { start: string; end: string } {
    return { start: this.start.toISOString(), end: this.end.toISOString() };
  }

  toString(): string {
    return `[${this.start.toISOString()}, ${this.end.toISOString()})`;
  }
}

export class TimeRangeError extends Error {
  override readonly name = 'TimeRangeError';
}
