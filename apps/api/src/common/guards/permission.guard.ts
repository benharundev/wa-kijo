import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@wa-kijo/shared';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { requestContextStorage } from '../context/request-context';

/**
 * Per-route guard: enforces @RequirePermission('resource:action').
 * Runs after AuthGuard — expects RequestContext to be fully populated.
 *
 * Routes without @RequirePermission are allowed through (permission is opt-in
 * per endpoint; authentication is opt-out via @Public()).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission annotation — access is open to any authenticated user.
    if (!requiredPermission) return true;

    const ctx = requestContextStorage.getStore();

    // Guard should not reach here without a populated ctx — AuthGuard runs first.
    if (!ctx?.userRole) {
      throw new ForbiddenException('No active session context');
    }

    if (!hasPermission(ctx.userRole, requiredPermission)) {
      throw new ForbiddenException(
        `Role '${ctx.userRole}' does not have permission '${requiredPermission}'`,
      );
    }

    return true;
  }
}
