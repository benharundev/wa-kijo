import { describe, it, expect } from 'vitest';
import { TimeRange, TimeRangeError } from './time-range.vo';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 10, h, m, 0));

describe('TimeRange — construction', () => {
  it('accepts Date inputs', () => {
    const tr = TimeRange.of(at(10), at(11));
    expect(tr.start).toEqual(at(10));
    expect(tr.end).toEqual(at(11));
  });

  it('accepts ISO string inputs', () => {
    const tr = TimeRange.of('2026-05-10T10:00:00Z', '2026-05-10T11:00:00Z');
    expect(tr.start.getUTCHours()).toBe(10);
  });

  it('rejects zero-length ranges', () => {
    expect(() => TimeRange.of(at(10), at(10))).toThrow(TimeRangeError);
  });

  it('rejects reversed ranges', () => {
    expect(() => TimeRange.of(at(11), at(10))).toThrow(TimeRangeError);
  });

  it('rejects invalid dates', () => {
    expect(() => TimeRange.of('not-a-date', at(11))).toThrow(TimeRangeError);
    expect(() => TimeRange.of(at(10), 'not-a-date')).toThrow(TimeRangeError);
  });
});

describe('TimeRange.durationMinutes', () => {
  it('returns the whole-minute length', () => {
    expect(TimeRange.of(at(10), at(11)).durationMinutes()).toBe(60);
  });

  it('floors sub-minute remainders', () => {
    const start = at(10);
    const end = new Date(start.getTime() + 90 * 1000); // 90 seconds
    expect(TimeRange.of(start, end).durationMinutes()).toBe(1);
  });
});

describe('TimeRange.overlaps — exhaustive cases', () => {
  // Reference range: 10:00 → 11:00
  const ref = TimeRange.of(at(10), at(11));

  it('identical ranges overlap', () => {
    expect(ref.overlaps(TimeRange.of(at(10), at(11)))).toBe(true);
  });

  it('contained range overlaps', () => {
    expect(ref.overlaps(TimeRange.of(at(10, 15), at(10, 45)))).toBe(true);
  });

  it('containing range overlaps', () => {
    expect(ref.overlaps(TimeRange.of(at(9), at(12)))).toBe(true);
  });

  it('partial overlap on the left', () => {
    expect(ref.overlaps(TimeRange.of(at(9, 30), at(10, 30)))).toBe(true);
  });

  it('partial overlap on the right', () => {
    expect(ref.overlaps(TimeRange.of(at(10, 30), at(11, 30)))).toBe(true);
  });

  it('touching at end (a.end === b.start) does NOT overlap (closed-open)', () => {
    expect(ref.overlaps(TimeRange.of(at(11), at(12)))).toBe(false);
  });

  it('touching at start (a.start === b.end) does NOT overlap (closed-open)', () => {
    expect(ref.overlaps(TimeRange.of(at(9), at(10)))).toBe(false);
  });

  it('gap on the left does not overlap', () => {
    expect(ref.overlaps(TimeRange.of(at(8), at(9)))).toBe(false);
  });

  it('gap on the right does not overlap', () => {
    expect(ref.overlaps(TimeRange.of(at(12), at(13)))).toBe(false);
  });

  it('overlap is symmetric', () => {
    const a = TimeRange.of(at(10), at(11));
    const b = TimeRange.of(at(10, 30), at(11, 30));
    expect(a.overlaps(b)).toBe(b.overlaps(a));
  });
});

describe('TimeRange.contains', () => {
  const ref = TimeRange.of(at(10), at(12));

  it('contains an inner range', () => {
    expect(ref.contains(TimeRange.of(at(10, 30), at(11)))).toBe(true);
  });

  it('contains a range coincident with the boundary', () => {
    expect(ref.contains(TimeRange.of(at(10), at(12)))).toBe(true);
  });

  it('does not contain a range that extends past the end', () => {
    expect(ref.contains(TimeRange.of(at(11), at(13)))).toBe(false);
  });

  it('does not contain a range that starts before', () => {
    expect(ref.contains(TimeRange.of(at(9), at(11)))).toBe(false);
  });
});

describe('TimeRange.equals', () => {
  it('compares by value', () => {
    const a = TimeRange.of(at(10), at(11));
    const b = TimeRange.of(at(10), at(11));
    expect(a.equals(b)).toBe(true);
    expect(a === b).toBe(false); // different instances
  });

  it('rejects different ranges', () => {
    const a = TimeRange.of(at(10), at(11));
    const b = TimeRange.of(at(10), at(11, 1));
    expect(a.equals(b)).toBe(false);
  });
});

describe('TimeRange — serialisation', () => {
  it('toISO returns ISO 8601 strings', () => {
    const tr = TimeRange.of(at(10), at(11));
    expect(tr.toISO()).toEqual({
      start: '2026-05-10T10:00:00.000Z',
      end: '2026-05-10T11:00:00.000Z',
    });
  });

  it('toString uses closed-open notation for clarity', () => {
    const tr = TimeRange.of(at(10), at(11));
    expect(tr.toString()).toBe('[2026-05-10T10:00:00.000Z, 2026-05-10T11:00:00.000Z)');
  });
});
