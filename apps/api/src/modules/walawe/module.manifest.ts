/**
 * Module manifest for `walawe` (Phase 7).
 *
 * wa'lawe is the first business module that consumes the Booking Core
 * kernel. The initial slice registers the module, exposes tournament
 * permissions, and establishes the domain aggregate surface for chess
 * tournament scheduling.
 */
export const manifest = {
  slug: 'walawe',
  name: "wa'lawe Chess Tournaments",
  version: '0.1.0',
  description:
    "Chess tournament management module: tournament setup, rounds, pairings, arbiter result entry, standings, and certificates.",
  dependencies: {
    '@wa-kijo/booking-core': '^0.1.0',
    contacts: '^0.5.0',
  },
  exposes: {
    permissions: [
      'tournament:create',
      'tournament:read',
      'tournament:update',
      'tournament:delete',
      'tournament:publish',
      'pairing:read',
      'pairing:update',
      'result:enter',
      'certificate:issue',
    ],
    hooks: [
      {
        name: 'walawe.tournament.created',
        description: 'Emitted after a tournament aggregate is created.',
        stability: 'experimental',
        schemaRef: 'TournamentCreatedPayloadSchema',
      },
      {
        name: 'walawe.round.published',
        description: 'Emitted when a round pairing set is published to players.',
        stability: 'experimental',
        schemaRef: 'RoundPublishedPayloadSchema',
      },
    ],
    customFields: [
      {
        entity: 'Tournament',
        slug: 'school-category',
        type: 'string',
        indexed: true,
        description: 'Optional school or age category used for Malaysian junior events.',
      },
    ],
    uiSlots: [
      {
        id: 'walawe.tournament.detail.sidebar',
        description: 'Right-side tournament detail panel for standings, certificates, and sponsor blocks.',
      },
    ],
    routes: ['/api/v1/walawe'],
  },
  config: {
    schema: {},
    defaults: {
      defaultPairingSystem: 'swiss',
      certificateVerificationEnabled: true,
      notificationFallback: ['web-push', 'whatsapp', 'telegram', 'email'],
    },
  },
  lifecycle: {},
} as const;
