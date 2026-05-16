# Module Registry

Runtime that turns wa'kijo from a fork-per-product boilerplate into a
**platform with pluggable business modules**. See
[ADR-0008](../../../../../docs/decisions/0008-module-registry.md) for
the full rationale.

## What's here

| File | Purpose |
|---|---|
| `module-registry.module.ts` | NestJS `@Global` module — wires everything below |
| `module-registry.service.ts` | The runtime authority. `OnApplicationBootstrap` discovers, validates, and persists manifests |
| `module-scanner.ts` | Boot-time discovery of `module.manifest.ts` files under `apps/api/src/modules/*/` |
| `dependency-resolver.ts` | Pure function — topological sort with semver checks. Refuses cycles / missing / incompatible deps |
| `require-module.decorator.ts` | `@RequireModule('slug')` — gates a route on a tenant having the module enabled |
| `require-module.guard.ts` | Reads the metadata, returns 404 (not 403) for non-enabled modules |
| `index.ts` | Public surface; other code imports from here |

## Boot sequence

```
OnApplicationBootstrap
   │
   ▼
ModuleScanner.scan()                    discovers `module.manifest.ts`
   │
   ▼
ModuleManifestSchema.parse()            Zod validates each manifest
   │
   ▼
resolveDependencyOrder()                topological sort + semver check
   │   throws on missing/incompatible/cycle → startup aborts
   ▼
prisma.module.upsert()  × N             Module rows synced
   │
   ▼
prisma.module.updateMany({ status: 'retired' })
                                        modules removed from source
                                        get marked retired (FK-safe)
```

## Usage

### Declaring a module

Each module folder ships a `module.manifest.ts`. Validated against
`ModuleManifestSchema` at boot. See `apps/api/src/modules/_template/module.manifest.ts`.

### Gating a route

```ts
import { RequireModule } from '@/platform/module-registry';

@Controller('tournaments')
@RequireModule('tournament')
export class TournamentsController { ... }
```

A request from a tenant without the `tournament` module enabled
receives a `404 NOT_FOUND`. We **never** disclose that the module
exists but isn't licensed for this tenant.

### Querying enabled status

```ts
constructor(private registry: ModuleRegistryService) {}

const enabled = await this.registry.isEnabled(orgId, 'tournament');
```

## Test gates

Run unit tests in this directory:

```bash
pnpm --filter @wa-kijo/api test -- --run src/platform/module-registry/
```

Mandatory cases (per the testing rules):

- Manifest schema rejection (invalid slug / version / permission).
- Dependency resolver cycle detection.
- Dependency resolver missing-dep detection.
- Dependency resolver semver-mismatch detection.
- `RequireModuleGuard` returns 404 (not 403) for an unknown slug.
- `RequireModuleGuard` returns 404 for a known-but-not-enabled slug.
- Cross-tenant isolation: tenant A enabling a module does not enable
  it for tenant B.
