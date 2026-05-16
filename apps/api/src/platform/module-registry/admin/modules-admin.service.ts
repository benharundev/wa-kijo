import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ModuleSummaryDto,
  TenantModuleStateDto,
  EnableModuleDto,
} from '@wa-kijo/shared';
import { Prisma } from '@wa-kijo/db';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestContext } from '../../../common/context/request-context';
import { ModuleRegistryService } from '../module-registry.service';
import {
  resolveDependencyOrder,
  DependencyResolutionError,
} from '../dependency-resolver';

/**
 * `ModulesAdminService` — orchestrates module enablement for the
 * active organisation.
 *
 * Boundary rules:
 * - The active orgId is read from `RequestContext` — never accepted
 *   from the caller. This is the single biggest defence against a
 *   tenant accidentally toggling another tenant's modules.
 * - Enabling a module that depends on another not-yet-enabled module
 *   is a 409 Conflict — we do not silently auto-enable transitive
 *   dependencies. Customers must opt-in to each module.
 * - Disabling a module that other enabled modules depend on is a 409
 *   Conflict — same reason.
 *
 * Cross-tenant isolation is enforced at the SQL layer via the
 * (organizationId, moduleId) composite key.
 */
@Injectable()
export class ModulesAdminService {
  private readonly logger = new Logger(ModulesAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ModuleRegistryService,
  ) {}

  /** All installed modules — global registry snapshot. */
  listInstalled(): ModuleSummaryDto[] {
    return this.registry.list().map((m) => {
      const row = this.findRow(m.slug);
      return {
        slug: m.slug,
        name: m.name,
        version: m.version,
        description: m.description,
        status: row?.status ?? 'active',
        installedAt: row?.installedAt.toISOString() ?? new Date().toISOString(),
      };
    });
  }

  /** Per-tenant view: every installed module + its enabled state. */
  async listForActiveOrg(ctx: RequestContext): Promise<TenantModuleStateDto[]> {
    const installed = this.registry.list();
    const rows = await this.prisma.tenantModule.findMany({
      where: { organizationId: ctx.orgId },
    });
    const byModuleId = new Map(rows.map((r) => [r.moduleId, r]));

    return installed.map((manifest) => {
      const id = this.lookupModuleId(manifest.slug);
      const row = id ? byModuleId.get(id) : undefined;
      return {
        slug: manifest.slug,
        enabled: row?.enabled ?? false,
        enabledAt: row?.enabledAt?.toISOString() ?? null,
        enabledBy: row?.enabledBy ?? null,
        config: (row?.configJson as Record<string, unknown> | null) ?? null,
      };
    });
  }

  /**
   * Enable a module for the active organisation. Idempotent — re-
   * enabling an already-enabled module updates the config payload but
   * does not error.
   *
   * Refuses to enable if any of the module's dependencies (per its
   * manifest) are not yet enabled for this tenant. Returns the slugs
   * of the missing dependencies in the 409 details.
   */
  async enable(
    ctx: RequestContext,
    slug: string,
    dto: EnableModuleDto,
  ): Promise<TenantModuleStateDto> {
    const manifest = this.registry.get(slug);
    if (!manifest) throw new NotFoundException();

    // Validate per-tenant config against the module's declared schema.
    // The module-manifest schema treats `config.schema` as `unknown`
    // (a serialised JSON-schema), so for v0.1.0 we only validate that
    // the payload is an object. Phase 6d wires Zod-based runtime
    // validation against the module's actual declared schema.
    if (dto.config !== undefined && typeof dto.config !== 'object') {
      throw new BadRequestException('config must be a JSON object');
    }

    // Dependency check — every dependency declared in the manifest
    // must already be enabled for this tenant (or be an external
    // workspace package, which the registry validated at boot).
    await this.assertDependenciesEnabled(ctx, slug);

    const moduleId = this.lookupModuleId(slug);
    if (!moduleId) throw new NotFoundException();

    const row = await this.prisma.tenantModule.upsert({
      where: { organizationId_moduleId: { organizationId: ctx.orgId, moduleId } },
      update: {
        enabled: true,
        enabledAt: new Date(),
        enabledBy: ctx.userId,
        configJson:
          dto.config === undefined
            ? Prisma.JsonNull
            : (dto.config as Prisma.InputJsonValue),
      },
      create: {
        organizationId: ctx.orgId,
        moduleId,
        enabled: true,
        enabledAt: new Date(),
        enabledBy: ctx.userId,
        configJson:
          dto.config === undefined
            ? Prisma.JsonNull
            : (dto.config as Prisma.InputJsonValue),
      },
    });

    this.logger.log(
      { orgId: ctx.orgId, slug, actor: ctx.userId },
      'Module enabled for tenant',
    );

    return {
      slug,
      enabled: row.enabled,
      enabledAt: row.enabledAt?.toISOString() ?? null,
      enabledBy: row.enabledBy ?? null,
      config: (row.configJson as Record<string, unknown> | null) ?? null,
    };
  }

  /**
   * Disable a module for the active organisation. Idempotent. Refuses
   * to disable if other enabled modules in this tenant depend on it
   * (Conflict).
   */
  async disable(ctx: RequestContext, slug: string): Promise<void> {
    const manifest = this.registry.get(slug);
    if (!manifest) throw new NotFoundException();

    await this.assertNoDependentsEnabled(ctx, slug);

    const moduleId = this.lookupModuleId(slug);
    if (!moduleId) throw new NotFoundException();

    await this.prisma.tenantModule.upsert({
      where: { organizationId_moduleId: { organizationId: ctx.orgId, moduleId } },
      update: { enabled: false, enabledAt: null, enabledBy: null },
      create: {
        organizationId: ctx.orgId,
        moduleId,
        enabled: false,
      },
    });

    this.logger.log(
      { orgId: ctx.orgId, slug, actor: ctx.userId },
      'Module disabled for tenant',
    );
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private findRow(
    slug: string,
  ):
    | { status: 'active' | 'deprecated' | 'retired'; installedAt: Date }
    | undefined {
    // The registry caches version+manifest in memory but doesn't expose
    // the DB row directly. For status / installedAt we'd ideally read
    // from `Module` — for v0.1.0 we report 'active' by default since
    // the registry only registers active modules.
    return undefined;
  }

  private lookupModuleId(slug: string): string | null {
    // `ModuleRegistryService` has a private `idBySlug` map but does
    // not expose it. Re-query Prisma — small cost, runs only on
    // admin endpoints which are very low-frequency.
    return this.lookupCache.get(slug) ?? null;
  }

  /** Hot path mitigation: lazily populate lookup cache on first use. */
  private readonly lookupCache = new Map<string, string>();

  // The cache is populated on the first admin request via this hook.
  // Called from the controller before each operation so we don't depend
  // on tricky NestJS lifecycle hooks here.
  async ensureLookupCache(): Promise<void> {
    if (this.lookupCache.size > 0) return;
    const rows = await this.prisma.module.findMany({
      where: { status: { not: 'retired' } },
      select: { id: true, slug: true },
    });
    for (const r of rows) this.lookupCache.set(r.slug, r.id);
  }

  private async assertDependenciesEnabled(
    ctx: RequestContext,
    slug: string,
  ): Promise<void> {
    const manifest = this.registry.get(slug);
    if (!manifest) return;

    const internalDeps = Object.keys(manifest.dependencies).filter((d) =>
      this.registry.get(d) !== null,
    );
    if (internalDeps.length === 0) return;

    const missing: string[] = [];
    for (const dep of internalDeps) {
      const enabled = await this.registry.isEnabled(ctx.orgId, dep);
      if (!enabled) missing.push(dep);
    }

    if (missing.length > 0) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: `Cannot enable "${slug}" — required modules are not enabled`,
        details: { missingDependencies: missing },
      });
    }
  }

  private async assertNoDependentsEnabled(
    ctx: RequestContext,
    slug: string,
  ): Promise<void> {
    const dependents = this.registry
      .list()
      .filter((m) => Object.keys(m.dependencies).includes(slug));
    if (dependents.length === 0) return;

    const blockers: string[] = [];
    for (const m of dependents) {
      const enabled = await this.registry.isEnabled(ctx.orgId, m.slug);
      if (enabled) blockers.push(m.slug);
    }

    if (blockers.length > 0) {
      throw new ConflictException({
        error: 'CONFLICT',
        message: `Cannot disable "${slug}" — other enabled modules depend on it`,
        details: { dependents: blockers },
      });
    }

    // Sanity: the platform-wide dependency graph is acyclic at boot
    // (resolveDependencyOrder enforces this on every startup), so we
    // don't need to re-check here. Reachable bug: a cycle would have
    // already aborted boot. This call is a defence-in-depth assertion.
    try {
      resolveDependencyOrder(this.registry.list());
    } catch (err) {
      if (err instanceof DependencyResolutionError && err.reason === 'cycle') {
        // Should be impossible in practice — log and bail loudly.
        this.logger.error(
          { details: err.details },
          'BUG: dependency cycle detected at runtime',
        );
        throw err;
      }
    }
  }
}
