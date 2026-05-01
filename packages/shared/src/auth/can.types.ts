/**
 * Client-side permission helper stubs.
 *
 * These types define the contract for useCan() and <Can /> in the frontend.
 * React implementations live in apps/web/ (Phase 4).
 *
 * Server-side enforcement is always via @RequirePermission — these are UX
 * helpers only and must NEVER be the sole security check.
 */
import type { Permission } from './permissions';
import type { Role } from './roles';

export interface CanContext {
  role: Role;
}

/** Returns true if the given context allows the given permission. */
export type CanCheck = (permission: Permission, ctx: CanContext) => boolean;

/**
 * Stub type for the React useCan() hook (implemented in Phase 4).
 * @example
 *   const can = useCan();
 *   if (can('billing:manage')) { ... }
 */
export type UseCanHook = () => (permission: Permission) => boolean;

/**
 * Stub type for the React <Can /> component (implemented in Phase 4).
 * @example
 *   <Can do="member:invite">
 *     <InviteButton />
 *   </Can>
 */
export interface CanProps {
  do: Permission;
  children: unknown; // React.ReactNode — typed in Phase 4
  fallback?: unknown;
}
