'use client';

import type { ReactNode } from 'react';
import type { Permission } from '@wa-kijo/shared';
import { useCan } from '@/hooks/use-can';

interface CanProps {
  do: Permission;
  children: ReactNode;
  /** Rendered when the user lacks the permission. Defaults to null. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's org role.
 *
 * UX hint only — server-side guards are the real security boundary.
 *
 * @example
 *   <Can do="member:invite">
 *     <InviteButton />
 *   </Can>
 */
export function Can({ do: permission, children, fallback = null }: CanProps) {
  const can = useCan();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
