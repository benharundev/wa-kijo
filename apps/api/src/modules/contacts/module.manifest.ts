/**
 * Module manifest for `contacts` (ADR-0008).
 *
 * Contacts is a foundational module — most other business modules
 * (tournament, workshop, marketplace) reference contacts. It does
 * not consume the Booking Core kernel; it has no scheduled
 * resources of its own.
 */
export const manifest = {
  slug: 'contacts',
  name: 'Contacts',
  version: '0.5.0',
  description:
    'Per-organisation contact directory — phone, email, tags, blocked flag. Foundational dependency for messaging, billing, and most business modules.',
  dependencies: {},
  exposes: {
    permissions: [
      'contact:create',
      'contact:read',
      'contact:update',
      'contact:delete',
      'contact:import',
      'contact:block',
      'tag:create',
      'tag:update',
      'tag:delete',
    ],
    hooks: [
      // Hook points emitted by this module — wired in Phase 6e once the
      // typed event-bus framework lands. Listed here as a forward
      // declaration so reviewers can spot drift.
      // {
      //   name: 'contacts.contact.created',
      //   description: 'Emitted after a new contact is persisted.',
      //   stability: 'experimental',
      //   schemaRef: 'ContactCreatedPayloadSchema',
      // },
    ],
    customFields: [],
    uiSlots: [],
    routes: ['/api/v1/contacts', '/api/v1/tags'],
  },
  config: {
    schema: {},
    defaults: {},
  },
  lifecycle: {},
} as const;
