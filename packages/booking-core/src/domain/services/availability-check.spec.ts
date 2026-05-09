import { describe, it, expect } from 'vitest';
import { AvailabilityCheckService } from './availability-check.service';
import { TimeRange } from '../time-range.vo';
import { OutsideAvailabilityError } from '../errors/outside-availability.error';
import type { AvailabilityRule } from '../availability-rule';

// 2026-05-10 was a Sunday (UTC). 2026-05-11 was a Monday.
const sunday = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 10, h, m, 0));
const monday = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 11, h, m, 0));

const workingHoursWeekdays: AvailabilityRule = {
  kind: 'working-hours',
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  startTime: '09:00',
  endTime: '18:00',
};

const blackout: AvailabilityRule = {
  kind: 'blackout',
  range: TimeRange.of(monday(12), monday(13)),
  reason: 'Lunch maintenance window',
};

describe('AvailabilityCheckService — working hours', () => {
  const svc = new AvailabilityCheckService();

  it('with no rules at all, every range is available', () => {
    expect(svc.isAvailable(TimeRange.of(sunday(3), sunday(4)), [])).toBe(true);
  });

  it('rejects a Sunday booking when only weekday hours exist', () => {
    expect(svc.isAvailable(TimeRange.of(sunday(10), sunday(11)), [workingHoursWeekdays])).toBe(
      false,
    );
  });

  it('accepts a Monday booking inside the window', () => {
    expect(svc.isAvailable(TimeRange.of(monday(10), monday(11)), [workingHoursWeekdays])).toBe(
      true,
    );
  });

  it('accepts a booking that ends exactly on the window close (closed-open)', () => {
    expect(svc.isAvailable(TimeRange.of(monday(17), monday(18)), [workingHoursWeekdays])).toBe(
      true,
    );
  });

  it('rejects a booking that starts before the window opens', () => {
    expect(
      svc.isAvailable(TimeRange.of(monday(8, 30), monday(9, 30)), [workingHoursWeekdays]),
    ).toBe(false);
  });

  it('rejects a booking that ends after the window closes', () => {
    expect(svc.isAvailable(TimeRange.of(monday(17), monday(19)), [workingHoursWeekdays])).toBe(
      false,
    );
  });
});

describe('AvailabilityCheckService — blackouts', () => {
  const svc = new AvailabilityCheckService();

  it('rejects a booking that overlaps a blackout', () => {
    expect(
      svc.isAvailable(TimeRange.of(monday(11), monday(13)), [workingHoursWeekdays, blackout]),
    ).toBe(false);
  });

  it('reports the blackout reason when supplied', () => {
    const reason = svc.reasonUnavailable(TimeRange.of(monday(12), monday(13)), [
      workingHoursWeekdays,
      blackout,
    ]);
    expect(reason).toBe('Lunch maintenance window');
  });

  it('accepts a booking immediately after a blackout (closed-open)', () => {
    expect(
      svc.isAvailable(TimeRange.of(monday(13), monday(14)), [workingHoursWeekdays, blackout]),
    ).toBe(true);
  });
});

describe('AvailabilityCheckService — assertAvailable', () => {
  const svc = new AvailabilityCheckService();

  it('throws OutsideAvailabilityError with the reason', () => {
    const candidate = {
      id: 's1',
      resourceId: 'bay-1',
      range: TimeRange.of(monday(12, 30), monday(13, 30)),
      state: 'requested' as const,
    };
    expect(() => svc.assertAvailable(candidate, [workingHoursWeekdays, blackout])).toThrow(
      OutsideAvailabilityError,
    );
  });

  it('passes silently when available', () => {
    const candidate = {
      id: 's1',
      resourceId: 'bay-1',
      range: TimeRange.of(monday(10), monday(11)),
      state: 'requested' as const,
    };
    expect(() => svc.assertAvailable(candidate, [workingHoursWeekdays])).not.toThrow();
  });
});
