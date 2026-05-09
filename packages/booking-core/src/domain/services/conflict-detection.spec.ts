import { describe, it, expect } from 'vitest';
import { ConflictDetectionService } from './conflict-detection.service';
import { TimeRange } from '../time-range.vo';
import { ConflictError } from '../errors/conflict.error';
import type { Schedulable } from '../schedulable.interface';
import type { BookingState } from '../booking-state';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 10, h, m, 0));

const sched = (
  id: string,
  resourceId: string,
  startH: number,
  endH: number,
  state: BookingState = 'confirmed',
): Schedulable => ({
  id,
  resourceId,
  range: TimeRange.of(at(startH), at(endH)),
  state,
});

describe('ConflictDetectionService', () => {
  const svc = new ConflictDetectionService();

  it('returns empty when no existing bookings', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    expect(svc.findOverlaps(candidate, [])).toEqual([]);
  });

  it('detects an overlapping confirmed booking on the same resource', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-1', 10, 12);
    const result = svc.findOverlaps(candidate, [existing]);
    expect(result).toHaveLength(1);
    expect(result.at(0)?.id).toBe('b');
  });

  it('does NOT conflict with a booking on a different resource', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-2', 10, 11);
    expect(svc.findOverlaps(candidate, [existing])).toEqual([]);
  });

  it('does NOT conflict with a cancelled booking (terminal state)', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-1', 10, 11, 'cancelled');
    expect(svc.findOverlaps(candidate, [existing])).toEqual([]);
  });

  it('does NOT conflict with a completed booking (terminal state)', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-1', 10, 11, 'completed');
    expect(svc.findOverlaps(candidate, [existing])).toEqual([]);
  });

  it('does NOT conflict with itself by id (update-flow safety)', () => {
    const candidate = sched('same-id', 'bay-1', 10, 11);
    const existing = sched('same-id', 'bay-1', 10, 11);
    expect(svc.findOverlaps(candidate, [existing])).toEqual([]);
  });

  it('does NOT conflict with a booking that merely touches end-to-start', () => {
    // 10-11 and 11-12 do not overlap (closed-open semantics).
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-1', 11, 12);
    expect(svc.findOverlaps(candidate, [existing])).toEqual([]);
  });

  it('returns multiple overlaps when several exist', () => {
    const candidate = sched('a', 'bay-1', 10, 13);
    const existing = [
      sched('b', 'bay-1', 9, 11), // overlaps left
      sched('c', 'bay-1', 12, 14), // overlaps right
      sched('d', 'bay-2', 10, 13), // different resource, no overlap
      sched('e', 'bay-1', 14, 15), // gap, no overlap
    ];
    const result = svc.findOverlaps(candidate, existing).map((s) => s.id);
    expect(result).toEqual(['b', 'c']);
  });

  it('assertNoOverlap throws ConflictError when overlaps exist', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = sched('b', 'bay-1', 10, 12);
    expect(() => svc.assertNoOverlap(candidate, [existing])).toThrow(ConflictError);
  });

  it('assertNoOverlap passes silently when no overlaps', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    expect(() => svc.assertNoOverlap(candidate, [])).not.toThrow();
  });

  it('ConflictError carries the candidate and the conflicting existing', () => {
    const candidate = sched('a', 'bay-1', 10, 11);
    const existing = [sched('b', 'bay-1', 10, 12), sched('c', 'bay-1', 10, 11)];
    try {
      svc.assertNoOverlap(candidate, existing);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      const ce = err as ConflictError;
      expect(ce.candidate.id).toBe('a');
      expect(ce.existing).toHaveLength(2);
    }
  });
});
