import { AsyncLocalStorage } from 'async_hooks';
import type { Role } from '@wa-kijo/shared';

export type OrgType = 'AGENCY' | 'WORKSPACE' | 'SYSTEM';
export type GlobalRole = 'user' | 'admin'; // matches Better Auth user.role

export interface RequestContext {
  userId: string;
  orgId: string;
  orgType: OrgType;
  /** Direct role of the user in the active org (lowercase, Better Auth default). */
  userRole: Role;
  /** Better Auth global user role. */
  globalRole: GlobalRole;
  requestId: string;
}

/**
 * AsyncLocalStorage store for the current request context.
 *
 * Lifecycle:
 *   1. main.ts onRequest hook calls requestContextStorage.run({requestId}, done)
 *      so the entire request chain has access to the store.
 *   2. AuthGuard fills in userId, orgId, orgType, userRole, globalRole.
 *   3. BaseRepository reads orgId to tenant-scope queries.
 *   4. @CurrentUser() decorator reads the full context for controllers.
 *
 * All fields except requestId start undefined — AuthGuard fills them after
 * session validation. Public routes skip AuthGuard and have a partial context.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
