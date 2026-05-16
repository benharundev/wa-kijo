import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { join } from 'node:path';
import type { ModuleManifest } from '@wa-kijo/shared';
import { Prisma } from '@wa-kijo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { EnvService } from '../../config/env.service';
import { ModuleScanner } from './module-scanner';
import {
  resolveDependencyOrder,
  DependencyResolutionError,
} from './dependency-resolver';

/**
 * `ModuleRegistryService` — the in-memory authority on what's installed,
 * what's enabled per tenant, and what each module exposes. Backed by
 * the `Module` and `TenantModule` Prisma tables.
 *
 * Boot sequence (`OnApplicationBootstrap`):
 *  1. Scanner discovers `module.manifest.ts` files.
 *  2. Each manifest is Zod-validated.
 *  3. Dependency resolver topologically sorts and rejects cycles /
 *     missing / incompatible dependencies. **Throws — startup aborts.**
 *  4. Each manifest is upserted into the `Module` table (status
 *     `active`). Modules previously installed but no longer present
 *     in the codebase are marked `retired`.
 *
 * After boot, `isEnabled(orgId, slug)` is the per-request lookup the
 * `RequireModuleGuard` calls. We cache `Module` rows in memory keyed by
 * slug; tenant flags are queried fresh per request (no cache yet — add
 * a Redis-backed one in Phase 6e).
 */
@Injectable()
export class ModuleRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ModuleRegistryService.name);
  private readonly bySlug = new Map<string, ModuleManifest>();
  /** Maps slug → DB row id, used by isEnabled() to avoid an extra lookup. */
  private readonly idBySlug = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly scanner: ModuleScanner,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async onApplicationBootstrap(): Promise<void> {
    const { manifests, errors } = await this.scanner.scan(this.modulesDir());

    if (errors.length > 0) {
      for (const e of errors) {
        this.logger.error({ path: e.path, error: e.message }, 'Manifest invalid');
      }
      throw new Error(
        `Module registry refused to start — ${errors.length} manifest(s) failed validation`,
      );
    }

    // Validate dependency graph BEFORE writing to DB.
    let order: string[];
    try {
      order = resolveDependencyOrder(manifests, this.externalVersions());
    } catch (err) {
      if (err instanceof DependencyResolutionError) {
        this.logger.error(
          {
            module: err.module,
            reason: err.reason,
            details: err.details,
          },
          err.message,
        );
      }
      throw err;
    }

    this.logger.log(
      { count: manifests.length, order },
      'Module dependency graph resolved',
    );

    // Upsert each manifest, then retire any orphaned rows.
    for (const slug of order) {
      const manifest = manifests.find((m) => m.slug === slug)!;
      await this.upsertManifest(manifest);
    }
    await this.retireOrphans(manifests.map((m) => m.slug));
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /** All registered, currently-active manifests (boot-time snapshot). */
  list(): readonly ModuleManifest[] {
    return [...this.bySlug.values()];
  }

  /** Lookup by slug. Returns null if the slug is unknown to this build. */
  get(slug: string): ModuleManifest | null {
    return this.bySlug.get(slug) ?? null;
  }

  /**
   * Whether `orgId` has the given module enabled. Returns false for an
   * unknown slug — the guard then 404s, which is the deliberate
   * non-disclosure behaviour.
   */
  async isEnabled(orgId: string, slug: string): Promise<boolean> {
    const moduleId = this.idBySlug.get(slug);
    if (!moduleId) return false;

    const row = await this.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: orgId, moduleId } },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private async upsertManifest(manifest: ModuleManifest): Promise<void> {
    const manifestJson = JSON.parse(JSON.stringify(manifest)) as Prisma.InputJsonValue;
    const row = await this.prisma.module.upsert({
      where: { slug: manifest.slug },
      update: {
        name: manifest.name,
        version: manifest.version,
        manifestJson,
        status: 'active',
      },
      create: {
        slug: manifest.slug,
        name: manifest.name,
        version: manifest.version,
        manifestJson,
      },
    });
    this.bySlug.set(manifest.slug, manifest);
    this.idBySlug.set(manifest.slug, row.id);
  }

  /**
   * Modules present in the DB but no longer present in the source tree
   * are marked `retired`. We do NOT delete the rows — `AuditLog`,
   * `TenantModule`, and historical references must keep resolving.
   */
  private async retireOrphans(activeSlugs: string[]): Promise<void> {
    const result = await this.prisma.module.updateMany({
      where: {
        slug: { notIn: activeSlugs },
        status: { not: 'retired' },
      },
      data: { status: 'retired' },
    });
    if (result.count > 0) {
      this.logger.log({ retired: result.count }, 'Retired orphaned modules');
    }
  }

  private modulesDir(): string {
    // In dev `__dirname` is `apps/api/src/platform/module-registry`,
    // so go up two levels then into `modules/`.
    // In prod (`dist/`), the same relative path holds.
    return join(__dirname, '..', '..', 'modules');
  }

  /**
   * Versions of external workspace packages that modules can declare
   * dependencies against. Hard-coded for v0.1.0; future revision will
   * read from the actual package.json files.
   */
  private externalVersions(): Record<string, string> {
    return {
      '@wa-kijo/booking-core': '0.1.0',
      '@wa-kijo/shared': '0.0.1',
      '@wa-kijo/db': '0.0.1',
    };
  }
}
