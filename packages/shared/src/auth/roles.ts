/**
 * Role definitions for wa-kijo's RBAC layer.
 *
 * Roles match Better Auth's organization plugin defaults (lowercase) so they
 * are stored as-is in the Member.role column without any translation layer.
 *
 * Hierarchy (highest → lowest privilege):
 *   owner > admin > member
 */

export const ROLES = ['owner', 'admin', 'member'] as const;
export type Role = (typeof ROLES)[number];

/** Returns true if `role` is a valid Role string. */
export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

/**
 * Role precedence map — higher number = more privilege.
 * Used when resolving effective role across an org hierarchy.
 */
export const ROLE_PRECEDENCE: Record<Role, number> = {
  owner: 30,
  admin: 20,
  member: 10,
};

/** Returns the higher-privilege role of the two. */
export function highestRole(a: Role, b: Role): Role {
  return ROLE_PRECEDENCE[a] >= ROLE_PRECEDENCE[b] ? a : b;
}
