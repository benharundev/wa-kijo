import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRegistryService } from './module-registry.service';
import { REQUIRE_MODULE_KEY } from './require-module.decorator';
import { requestContextStorage } from '../../common/context/request-context';

/**
 * `RequireModuleGuard` — runs **after** `AuthGuard` and
 * `PermissionGuard`. Reads the `@RequireModule()` metadata; if the
 * route requires a module and the active organisation has not
 * enabled it, throws `NotFoundException`.
 *
 * 404 (not 403) is the deliberate response — see the decorator's
 * docstring and `docs/api-conventions.md` § 8.
 */
@Injectable()
export class RequireModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: ModuleRegistryService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const slug = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_MODULE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!slug) return true;

    // If the slug is unknown to this build, fail closed — 404.
    if (!this.registry.get(slug)) {
      throw new NotFoundException();
    }

    const reqCtx = requestContextStorage.getStore();
    if (!reqCtx?.orgId) {
      // No active org → no module access. Same 404 to avoid disclosure.
      throw new NotFoundException();
    }

    const enabled = await this.registry.isEnabled(reqCtx.orgId, slug);
    if (!enabled) throw new NotFoundException();

    return true;
  }
}
