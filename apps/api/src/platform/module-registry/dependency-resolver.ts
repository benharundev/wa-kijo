import type { ModuleManifest } from '@wa-kijo/shared';

/**
 * Dependency resolver — pure function. No I/O.
 *
 * Resolves the topological order of a set of module manifests. Refuses
 * to return an order if:
 *
 *  1. A declared dependency is missing from the installed set.
 *  2. The installed dep's version does not satisfy the declared range.
 *  3. The dependency graph contains a cycle.
 *
 * On success returns an ordered slug list — installing modules in this
 * order guarantees every dependency is registered before its dependent.
 *
 * SemVer matching is intentionally permissive in v0.1.0 — caret (`^`),
 * tilde (`~`), exact, and `*` are honoured. A full semver implementation
 * (using the `semver` npm package) lands when wa'lawe + Workshop both
 * exist and we have real range expressions to satisfy.
 */

export class DependencyResolutionError extends Error {
  override readonly name = 'DependencyResolutionError';
  constructor(
    message: string,
    public readonly module: string,
    public readonly reason: 'missing' | 'incompatible' | 'cycle',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

interface DepCarrier {
  slug: string;
  version: string;
  dependencies: Record<string, string>;
}

/**
 * Returns the topologically-sorted slugs given a manifest set.
 * External package versions (e.g. `@wa-kijo/booking-core@0.1.0`) are
 * supplied via `externalVersions` so the resolver can validate ranges
 * against installed packages without scanning node_modules.
 */
export function resolveDependencyOrder(
  manifests: readonly ModuleManifest[],
  externalVersions: Readonly<Record<string, string>> = {},
): string[] {
  const slugIndex = new Map(manifests.map((m) => [m.slug, m]));

  // 1. Validate every declared dep is satisfiable.
  for (const m of manifests) {
    for (const [dep, range] of Object.entries(m.dependencies)) {
      const declaredVersion =
        slugIndex.get(dep)?.version ?? externalVersions[dep];
      if (!declaredVersion) {
        throw new DependencyResolutionError(
          `Module "${m.slug}" depends on "${dep}" which is not installed`,
          m.slug,
          'missing',
          { dep, range },
        );
      }
      if (!satisfies(declaredVersion, range)) {
        throw new DependencyResolutionError(
          `Module "${m.slug}" requires "${dep}" range "${range}" but installed version is "${declaredVersion}"`,
          m.slug,
          'incompatible',
          { dep, range, installed: declaredVersion },
        );
      }
    }
  }

  // 2. Topological sort (Kahn's algorithm). Reject cycles.
  const carriers: DepCarrier[] = manifests.map((m) => ({
    slug: m.slug,
    version: m.version,
    dependencies: m.dependencies,
  }));

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const c of carriers) {
    inDegree.set(c.slug, 0);
    adj.set(c.slug, []);
  }
  for (const c of carriers) {
    for (const dep of Object.keys(c.dependencies)) {
      // Only consider intra-set edges (external packages have no slug here).
      if (slugIndex.has(dep)) {
        adj.get(dep)!.push(c.slug);
        inDegree.set(c.slug, (inDegree.get(c.slug) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [slug, deg] of inDegree) if (deg === 0) queue.push(slug);
  queue.sort(); // deterministic output

  const order: string[] = [];
  while (queue.length > 0) {
    const slug = queue.shift()!;
    order.push(slug);
    const next = adj.get(slug) ?? [];
    for (const dependent of next) {
      const newDeg = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) {
        queue.push(dependent);
        queue.sort();
      }
    }
  }

  if (order.length < manifests.length) {
    const remaining = manifests
      .map((m) => m.slug)
      .filter((s) => !order.includes(s));
    throw new DependencyResolutionError(
      `Cyclic dependency among modules: ${remaining.join(', ')}`,
      remaining[0] ?? 'unknown',
      'cycle',
      { cycle: remaining },
    );
  }

  return order;
}

// ── Semver matcher (intentionally minimal in v0.1.0) ─────────────────────────

export function satisfies(version: string, range: string): boolean {
  const v = parseSemver(version);
  if (!v) return false;
  const trimmed = range.trim();

  if (trimmed === '*' || trimmed === '') return true;

  // Exact match.
  if (/^\d/.test(trimmed)) {
    return version === trimmed;
  }

  // Caret: ^X.Y.Z compatible with same major and ≥ given minor/patch.
  if (trimmed.startsWith('^')) {
    const r = parseSemver(trimmed.slice(1));
    if (!r) return false;
    if (r.major === 0) {
      // ^0.x.y locks to same minor (npm behaviour).
      return v.major === 0 && v.minor === r.minor && cmp(v, r) >= 0;
    }
    return v.major === r.major && cmp(v, r) >= 0;
  }

  // Tilde: ~X.Y.Z compatible with same minor.
  if (trimmed.startsWith('~')) {
    const r = parseSemver(trimmed.slice(1));
    if (!r) return false;
    return v.major === r.major && v.minor === r.minor && cmp(v, r) >= 0;
  }

  // Greater-or-equal.
  if (trimmed.startsWith('>=')) {
    const r = parseSemver(trimmed.slice(2).trim());
    if (!r) return false;
    return cmp(v, r) >= 0;
  }

  return false;
}

interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
}

function parseSemver(s: string): ParsedSemver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(s);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

function cmp(a: ParsedSemver, b: ParsedSemver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}
