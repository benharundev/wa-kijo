/**
 * Module manifest for `conversations` (ADR-0008).
 *
 * Conversations is the messaging-domain root — open / closed / snoozed
 * threads on a channel (whatsapp / email / sms), with messages queued
 * for outbound dispatch.
 *
 * Depends on `contacts` (every conversation has a contact). Declared
 * via the dependency map so the registry refuses to start if contacts
 * is missing or version-incompatible.
 */
export const manifest = {
  slug: 'conversations',
  name: 'Conversations',
  version: '0.5.0',
  description:
    'Inbox of channel-agnostic conversations with their inbound and outbound messages. Outbound messages are queued for dispatch via BullMQ.',
  dependencies: {
    contacts: '^0.5.0',
  },
  exposes: {
    permissions: [
      'conversation:create',
      'conversation:read',
      'conversation:assign',
      'conversation:close',
      'conversation:delete',
      'message:send',
      'message:read',
    ],
    hooks: [
      // Phase 6e: declare hooks for `conversation.opened`,
      // `conversation.closed`, `message.outbound.queued`,
      // `message.inbound.received` once the typed event-bus framework
      // lands.
    ],
    customFields: [],
    uiSlots: [],
    routes: ['/api/v1/conversations'],
  },
  config: {
    schema: {},
    defaults: {},
  },
  lifecycle: {},
} as const;
