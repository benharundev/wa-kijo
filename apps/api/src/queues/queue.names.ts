export const QUEUE_NAMES = {
  /** Outbound message delivery — picked up by MessageDispatchProcessor. */
  MESSAGE_DISPATCH: 'message-dispatch',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
