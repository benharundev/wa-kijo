/**
 * Lifecycle state for any `Schedulable`. Universal across consumers:
 * - wa'lawe: a tournament round pairing is requested → confirmed →
 *   completed (or cancelled if a player withdraws).
 * - Workshop: an appointment is requested → confirmed → completed
 *   (or cancelled by the customer or no-show).
 * - Property rental: a stay is requested → confirmed → completed
 *   (or cancelled).
 *
 * The same five states with the same allowed transitions cover all
 * three. Module-specific sub-states (e.g. `awaiting_payment`,
 * `mechanic_assigned`) live in the consuming module and are NOT in
 * the kernel.
 */
export const BOOKING_STATES = ['requested', 'confirmed', 'cancelled', 'completed'] as const;
export type BookingState = (typeof BOOKING_STATES)[number];

/**
 * Allowed transitions. Read as: from `requested` you can go to
 * `confirmed` or `cancelled`. Terminal states (`cancelled`,
 * `completed`) have empty arrays — once there, you stay.
 */
const TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  cancelled: [],
  completed: [],
};

export function canTransition(from: BookingState, to: BookingState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidStateTransitionError extends Error {
  override readonly name = 'InvalidStateTransitionError';
  constructor(from: BookingState, to: BookingState) {
    super(`Cannot transition booking from "${from}" to "${to}"`);
  }
}

/**
 * Throws `InvalidStateTransitionError` if the transition is not
 * allowed. Use inside aggregate methods to enforce the invariant in
 * one place.
 */
export function assertTransition(from: BookingState, to: BookingState): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

/** True iff the state is terminal (no further transitions allowed). */
export function isTerminal(state: BookingState): boolean {
  return TRANSITIONS[state].length === 0;
}
