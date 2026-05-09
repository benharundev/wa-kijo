import { describe, it, expect } from 'vitest';
import {
  BOOKING_STATES,
  InvalidStateTransitionError,
  assertTransition,
  canTransition,
  isTerminal,
} from './booking-state';

describe('BookingState — transitions', () => {
  it('requested → confirmed is allowed', () => {
    expect(canTransition('requested', 'confirmed')).toBe(true);
  });

  it('requested → cancelled is allowed', () => {
    expect(canTransition('requested', 'cancelled')).toBe(true);
  });

  it('confirmed → cancelled is allowed', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
  });

  it('confirmed → completed is allowed', () => {
    expect(canTransition('confirmed', 'completed')).toBe(true);
  });

  it('requested → completed is NOT allowed (must confirm first)', () => {
    expect(canTransition('requested', 'completed')).toBe(false);
  });

  it('cancelled → anything is NOT allowed', () => {
    for (const target of BOOKING_STATES) {
      expect(canTransition('cancelled', target)).toBe(false);
    }
  });

  it('completed → anything is NOT allowed', () => {
    for (const target of BOOKING_STATES) {
      expect(canTransition('completed', target)).toBe(false);
    }
  });

  it('self-transitions are NOT allowed (no-op is not a transition)', () => {
    for (const state of BOOKING_STATES) {
      expect(canTransition(state, state)).toBe(false);
    }
  });
});

describe('BookingState — assertTransition', () => {
  it('passes silently for valid transitions', () => {
    expect(() => assertTransition('requested', 'confirmed')).not.toThrow();
  });

  it('throws InvalidStateTransitionError for invalid transitions', () => {
    expect(() => assertTransition('cancelled', 'confirmed')).toThrow(InvalidStateTransitionError);
  });
});

describe('BookingState — isTerminal', () => {
  it('cancelled is terminal', () => {
    expect(isTerminal('cancelled')).toBe(true);
  });
  it('completed is terminal', () => {
    expect(isTerminal('completed')).toBe(true);
  });
  it('requested is not terminal', () => {
    expect(isTerminal('requested')).toBe(false);
  });
  it('confirmed is not terminal', () => {
    expect(isTerminal('confirmed')).toBe(false);
  });
});
