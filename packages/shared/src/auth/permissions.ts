import type { Role } from './roles';

/**
 * Permission catalogue.
 *
 * Format: '<resource>:<action>'
 * Values: array of roles that hold that permission.
 *
 * This is the single source of truth used by:
 *  - @RequirePermission decorator (server-side enforcement)
 *  - useCan() / <Can /> (client-side UX hints — NOT security)
 *
 * Add new permissions here when adding new features.
 * Server enforcement is automatic; no guard code changes needed.
 */
export const PERMISSIONS = {
  // Members
  'member:invite': ['owner', 'admin'],
  'member:remove': ['owner'],
  'member:update-role': ['owner'],
  'member:list': ['owner', 'admin', 'member'],

  // Organisation
  'org:update': ['owner', 'admin'],
  'org:delete': ['owner'],
  'org:create-child': ['owner'],

  // Billing
  'billing:manage': ['owner'],
  'billing:view': ['owner', 'admin'],

  // Contacts
  'contact:create': ['owner', 'admin', 'member'],
  'contact:read':   ['owner', 'admin', 'member'],
  'contact:update': ['owner', 'admin', 'member'],
  'contact:delete': ['owner', 'admin'],
  'contact:import': ['owner', 'admin'],
  'contact:block':  ['owner', 'admin'],

  // Tags
  'tag:create': ['owner', 'admin'],
  'tag:update': ['owner', 'admin'],
  'tag:delete': ['owner', 'admin'],

  // Conversations
  'conversation:create': ['owner', 'admin', 'member'],
  'conversation:read':   ['owner', 'admin', 'member'],
  'conversation:assign': ['owner', 'admin'],
  'conversation:close':  ['owner', 'admin', 'member'],
  'conversation:delete': ['owner', 'admin'],

  // Messages
  'message:send': ['owner', 'admin', 'member'],
  'message:read': ['owner', 'admin', 'member'],

  // API keys (future)
  'api-key:create': ['owner', 'admin'],
  'api-key:revoke': ['owner'],

  // Template module examples (compile-time scaffold only)
  'example:create': ['owner', 'admin'],
  'example:read': ['owner', 'admin', 'member'],

  // Platform — Module Registry (ADR-0008)
  // module:list  — read what's installed and what's enabled for the org.
  // module:toggle — enable/disable a module for the active org. Owner-only
  //                 because flipping a module changes what data the org can
  //                 produce and which hooks fire on its behalf.
  'module:list': ['owner', 'admin'],
  'module:toggle': ['owner'],

  // wa'lawe — Chess tournament module (Phase 7)
  'tournament:create': ['owner', 'admin'],
  'tournament:read': ['owner', 'admin', 'member'],
  'tournament:update': ['owner', 'admin'],
  'tournament:delete': ['owner'],
  'tournament:publish': ['owner', 'admin'],
  'pairing:read': ['owner', 'admin', 'member'],
  'pairing:update': ['owner', 'admin'],
  'result:enter': ['owner', 'admin', 'member'],
  'certificate:issue': ['owner', 'admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Returns true if the given role holds the given permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
