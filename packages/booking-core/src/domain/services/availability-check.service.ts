import type { TimeRange } from '../time-range.vo';
import type {
  AvailabilityRule,
  WorkingHoursRule,
  BlackoutRule,
  DayOfWeek,
  ClockTime,
} from '../availability-rule';
import { OutsideAvailabilityError } from '../errors/outside-availability.error';
import type { Schedulable } from '../schedulable.interface';

/**
 * `AvailabilityCheckService` — pure domain service. Stateless.
 *
 * Determines whether a candidate `TimeRange` falls within the
 * availability window expressed by a set of `AvailabilityRule`s.
 *
 * Decision logic:
 * 1. If there is any `WorkingHoursRule` for the candidate's day of
 *    week, the entire candidate range must be contained within at
 *    least one such rule's window. (No working-hours rules at all
 *    means "always open" — the consumer chose not to restrict.)
 * 2. The candidate must NOT overlap any `BlackoutRule`.
 *
 * Rules are evaluated in UTC. Consumer modules convert to/from local
 * time at their boundary.
 */
export class AvailabilityCheckService {
  /**
   * Returns `null` if the candidate is available; otherwise a human
   * readable reason. Use directly when you need to discriminate
   * the failure mode.
   */
  reasonUnavailable(candidate: TimeRange, rules: readonly AvailabilityRule[]): string | null {
    const workingHours = rules.filter(isWorkingHoursRule);
    const blackouts = rules.filter(isBlackoutRule);

    // Rule 1 — working hours envelope (only enforced if any are declared).
    if (workingHours.length > 0) {
      const day = candidate.start.getUTCDay() as DayOfWeek;
      const applicable = workingHours.filter((wh) => wh.daysOfWeek.includes(day));
      if (applicable.length === 0) {
        return `Resource is closed on ${dayName(day)}`;
      }
      const candidateMinutes = {
        start: minutesOfDay(candidate.start),
        end: minutesOfDay(candidate.end),
      };
      const fits = applicable.some((wh) => windowContainsMinutes(wh, candidateMinutes));
      if (!fits) {
        return `Outside working hours for ${dayName(day)}`;
      }
    }

    // Rule 2 — blackouts.
    for (const bl of blackouts) {
      if (candidate.overlaps(bl.range)) {
        return bl.reason ?? 'Resource is on a blackout window';
      }
    }

    return null;
  }

  /** Returns true iff the candidate range is available. */
  isAvailable(candidate: TimeRange, rules: readonly AvailabilityRule[]): boolean {
    return this.reasonUnavailable(candidate, rules) === null;
  }

  /**
   * Throws `OutsideAvailabilityError` if the candidate is not
   * available. Use inside use cases.
   */
  assertAvailable(schedulable: Schedulable, rules: readonly AvailabilityRule[]): void {
    const reason = this.reasonUnavailable(schedulable.range, rules);
    if (reason !== null) {
      throw new OutsideAvailabilityError(schedulable, reason);
    }
  }
}

// ── Type guards ────────────────────────────────────────────────────────────

function isWorkingHoursRule(r: AvailabilityRule): r is WorkingHoursRule {
  return r.kind === 'working-hours';
}

function isBlackoutRule(r: AvailabilityRule): r is BlackoutRule {
  return r.kind === 'blackout';
}

// ── ClockTime helpers ──────────────────────────────────────────────────────

function minutesOfDay(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function clockToMinutes(t: ClockTime): number {
  const [h, m] = t.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid clock time: ${t}`);
  }
  return h * 60 + m;
}

function windowContainsMinutes(
  wh: WorkingHoursRule,
  range: { start: number; end: number },
): boolean {
  const s = clockToMinutes(wh.startTime);
  const e = clockToMinutes(wh.endTime);
  // closed-open: candidate.end can equal window end exactly
  return range.start >= s && range.end <= e;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function dayName(d: DayOfWeek): string {
  return DAY_NAMES[d];
}
