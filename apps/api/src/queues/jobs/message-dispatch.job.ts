/** Payload enqueued when an outbound message is created. */
export interface MessageDispatchJobData {
  messageId: string;
  conversationId: string;
  organizationId: string;
  /** The channel the message should be dispatched on (whatsapp | email | sms). */
  channel: string;
}
