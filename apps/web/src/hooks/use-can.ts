'use client';

import { useSession } from '@/lib/auth-client';
import { hasPermission, type Permission } from '@wa-kijo/shared';
import { isRole } from '@wa-kijo/shared';

/**
 * Returns a function that checks whether the current user has a given permission
 * in their active organisation.
 *
 * This is a UX hint only. Server-side @RequirePermission guards are the actual
 * security boundary.
 *
 * @example
 *   const can = useCan();
 *   if (can('member:invite')) { ... }
 */
export function useCan() {
  const { data: session } = useSession();

  return (permission: Permission): boolean => {
    if (!session) return false;

    // Better Auth's organization plugin attaches the active member role
    // to the session under session.user.role when an org is active.
    const rawRole: unknown = (session as { user?: { role?: unknown } }).user?.role;
    if (!isRole(rawRole)) return false;

    return hasPermission(rawRole, permission);
  };
}
