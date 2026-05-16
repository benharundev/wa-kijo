import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequireModuleGuard } from './require-module.guard';
import type { ModuleRegistryService } from './module-registry.service';
import { requestContextStorage } from '../../common/context/request-context';
import { REQUIRE_MODULE_KEY } from './require-module.decorator';

/**
 * Unit test — `RequireModuleGuard`.
 *
 * The single security-critical assertion this guard makes is the
 * **404-not-403** convention from ADR-0008 and `docs/api-conventions.md`
 * § 8: a request to a route requiring a module the active organisation
 * has not enabled must be indistinguishable from a request to a route
 * that doesn't exist. 403 leaks "this feature exists but you don't
 * have it" — exactly what we don't want to disclose.
 *
 * Three scenarios (all return NotFoundException):
 *  1. Slug is unknown to this build (typo, retired module, manifest missing).
 *  2. Slug is known but the active org has not enabled it.
 *  3. There is no active org context (shouldn't happen in practice; defensive).
 *
 * One scenario passes through:
 *  4. Slug is known and the active org has it enabled.
 */
describe('RequireModuleGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let registry: { get: ReturnType<typeof vi.fn>; isEnabled: ReturnType<typeof vi.fn> };
  let guard: RequireModuleGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    registry = { get: vi.fn(), isEnabled: vi.fn() };
    guard = new RequireModuleGuard(
      reflector as unknown as Reflector,
      registry as unknown as ModuleRegistryService,
    );
  });

  const mockExecCtx = () => {
    const handler = () => undefined;
    class TestController {}

    return {
      getHandler: () => handler,
      getClass: () => TestController,
    } as never;
  };

  /** Helper — runs the guard inside a populated AsyncLocalStorage context. */
  const runWithCtx = (orgId: string, fn: () => Promise<unknown>) =>
    new Promise<unknown>((resolve, reject) => {
      requestContextStorage.run(
        {
          requestId: 'req_test',
          userId: 'user_a',
          orgId,
          orgType: 'WORKSPACE',
          userRole: 'admin',
          globalRole: 'user',
        },
        () => fn().then(resolve, reject),
      );
    });

  it('allows a route with no @RequireModule metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await runWithCtx('org_a', () => guard.canActivate(mockExecCtx()));
    expect(result).toBe(true);
  });

  it('returns 404 when the slug is unknown to this build', async () => {
    reflector.getAllAndOverride.mockReturnValue('ghost-module');
    registry.get.mockReturnValue(null);

    await expect(
      runWithCtx('org_a', () => guard.canActivate(mockExecCtx())),
    ).rejects.toThrow(NotFoundException);

    // Critical: registry.isEnabled must NOT be called for unknown slugs —
    // the guard short-circuits to non-disclosure 404 immediately.
    expect(registry.isEnabled).not.toHaveBeenCalled();
  });

  it('returns 404 when the slug is known but the active org has not enabled it', async () => {
    reflector.getAllAndOverride.mockReturnValue('workshop');
    registry.get.mockReturnValue({ slug: 'workshop' });
    registry.isEnabled.mockResolvedValue(false);

    await expect(
      runWithCtx('org_a', () => guard.canActivate(mockExecCtx())),
    ).rejects.toThrow(NotFoundException);

    expect(registry.isEnabled).toHaveBeenCalledWith('org_a', 'workshop');
  });

  it('returns 404 when there is no active org context', async () => {
    reflector.getAllAndOverride.mockReturnValue('workshop');
    registry.get.mockReturnValue({ slug: 'workshop' });

    await expect(
      runWithCtx('', () => guard.canActivate(mockExecCtx())),
    ).rejects.toThrow(NotFoundException);

    // Same defence — never call isEnabled with an empty orgId.
    expect(registry.isEnabled).not.toHaveBeenCalled();
  });

  it('passes through when the slug is known and enabled for the active org', async () => {
    reflector.getAllAndOverride.mockReturnValue('workshop');
    registry.get.mockReturnValue({ slug: 'workshop' });
    registry.isEnabled.mockResolvedValue(true);

    const result = await runWithCtx('org_a', () => guard.canActivate(mockExecCtx()));
    expect(result).toBe(true);
  });

  it('uses the @RequireModule metadata from handler OR class', async () => {
    reflector.getAllAndOverride.mockReturnValue('workshop');
    registry.get.mockReturnValue({ slug: 'workshop' });
    registry.isEnabled.mockResolvedValue(true);

    const ctx = mockExecCtx();
    await runWithCtx('org_a', () => guard.canActivate(ctx));

    // Verify the guard asked for [handler, class] override resolution
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_MODULE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
  });
});
