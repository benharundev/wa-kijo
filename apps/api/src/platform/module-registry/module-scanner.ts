import { Injectable, Logger } from '@nestjs/common';
import { readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { ModuleManifestSchema, type ModuleManifest } from '@wa-kijo/shared';

/**
 * Module scanner — boot-time discovery of `module.manifest.ts` files.
 *
 * Convention: every business module lives under
 * `apps/api/src/modules/<slug>/module.manifest.ts` and exports its
 * manifest as a named `manifest` constant (or `default` export).
 *
 * The scanner reads the resolved compile output (`dist/...`) when
 * running in production and the source tree (`src/...`) in dev. The
 * dev path is resolved relative to this file so it works whether the
 * binary runs from `dist/` (after `nest build`) or from sources via
 * `nest start --watch`.
 *
 * Modules whose slug starts with `_` are skipped (the canonical
 * `_template/` scaffold lives under `src/modules/_template/` and is
 * not a real module).
 */

@Injectable()
export class ModuleScanner {
  private readonly logger = new Logger(ModuleScanner.name);

  /**
   * Scan the modules directory and return the parsed, validated
   * manifests. Files that fail validation are logged at error level
   * and skipped — but the registry treats this as a startup error
   * (see ModuleRegistryService).
   */
  async scan(modulesDir: string): Promise<{
    manifests: ModuleManifest[];
    errors: Array<{ path: string; message: string }>;
  }> {
    const manifests: ModuleManifest[] = [];
    const errors: Array<{ path: string; message: string }> = [];

    const slugDirs = this.findCandidateDirs(modulesDir);
    for (const dir of slugDirs) {
      const slug = basename(dir);
      if (slug.startsWith('_')) {
        this.logger.debug({ slug, dir }, 'Skipping template / private module');
        continue;
      }

      const manifestPath = this.resolveManifestPath(dir);
      if (!manifestPath) {
        // Modules without a manifest are NOT errors during the
        // transition period (Phase 6a roll-out). Once Phase 6c
        // refactor lands and every existing module has a manifest,
        // this becomes an error.
        this.logger.warn(
          { slug, dir },
          'Module directory has no module.manifest.ts — will be skipped by the registry',
        );
        continue;
      }

      try {
        const mod = await this.dynamicImport(manifestPath);
        // Accept both `export const manifest = ...` and `export default ...`
        const raw = (mod as { manifest?: unknown; default?: unknown }).manifest
          ?? (mod as { default?: unknown }).default
          ?? mod;

        const parsed = ModuleManifestSchema.parse(raw);

        if (parsed.slug !== slug) {
          errors.push({
            path: manifestPath,
            message: `Manifest slug "${parsed.slug}" does not match folder name "${slug}"`,
          });
          continue;
        }

        manifests.push(parsed);
        this.logger.log(
          { slug: parsed.slug, version: parsed.version },
          'Module manifest loaded',
        );
      } catch (err) {
        errors.push({
          path: manifestPath,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { manifests, errors };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private findCandidateDirs(modulesDir: string): string[] {
    let entries: string[] = [];
    try {
      entries = readdirSync(modulesDir);
    } catch (err) {
      this.logger.error(
        { modulesDir, error: err instanceof Error ? err.message : err },
        'modules directory not readable',
      );
      return [];
    }

    return entries
      .map((name) => join(modulesDir, name))
      .filter((p) => {
        try {
          return statSync(p).isDirectory();
        } catch {
          return false;
        }
      });
  }

  private resolveManifestPath(dir: string): string | null {
    // Prefer compiled .js (production) over .ts (dev).
    for (const candidate of [
      join(dir, 'module.manifest.js'),
      join(dir, 'module.manifest.ts'),
    ]) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  private async dynamicImport(path: string): Promise<unknown> {
    // require() works for both .js and (under SWC dev) compiled .ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path);
  }
}
