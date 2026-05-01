import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@wa-kijo/shared';

/**
 * Enforce a specific permission on a route handler.
 * Evaluated by PermissionGuard after AuthGuard populates the RequestContext.
 *
 * @example
 *   @RequirePermission('member:invite')
 *   @Post('invitations')
 *   createInvitation() { ... }
 */
export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
