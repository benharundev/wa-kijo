'use client';

import { useSession as useBetterAuthSession } from '@/lib/auth-client';

/**
 * Typed wrapper around Better Auth's useSession().
 *
 * Returns { session, isPending, error } where session is null when the user
 * is not signed in.
 */
export function useSession() {
  return useBetterAuthSession();
}
