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

  // API keys (future)
  'api-key:create': ['owner', 'admin'],
  'api-key:revoke': ['owner'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Returns true if the given role holds the given permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
