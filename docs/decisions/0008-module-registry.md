# ADR 0008 — Module Registry & per-tenant module enablement

**Date:** 2026-05-10 **Status:** Accepted **Deciders:** wa-kijo core team

> Supersedes the implicit "fork wa-kijo per product" model documented in
> `CLAUDE.md` and the README. The fork-per-product approach is retained as the
> **fallback** path of last resort (ADR-0010 § "When forking is the right
> answer"); the default path is now modules-on-platform.

---

## Context

wa-kijo today distributes one product as one repository. wa-kiro (WhatsApp),
wa-lawe (chess tournaments), and the planned wa-bengkel (workshop) have all been
positioned as **forks** of wa-kijo. That model was the right choice for Phases
1–5 — it kept the product simple to explain and let each downstream product
diverge freely.

It does not survive contact with the customer story we now want to tell. A
customer who buys "the Workshop product" and "the Tournament product" shouldn't
have to operate two databases, two auth systems, two billing configurations.
They want **one platform with two business modules turned on**. We also want to
ship platform improvements (auth, audit, billing) to every business module
simultaneously, without N forks diverging.

The architectural reference (the Modular Enterprise SaaS diagrams, attached to
the platform-pivot conversation) captures this: a SaaS Core Platform underneath,
a Module Registry that knows which modules exist and which a tenant has enabled,
Shared Engines (Booking Core, notifications, workflow), Business Modules, and a
Customization Layer that lets a tenant adjust a module without forking it.

This ADR fixes the Module Registry. The shared engines are ADR-0010. The
Customization Layer is ADR-0011 (drafted next phase).

---

## Decision

**We introduce a `Module` registry inside wa-kijo. Every business domain — old
and new — ships as a registered module. Tenants enable or disable modules per
organisation. The registry validates module manifests at boot and refuses to
start with incompatible dependencies.**

Two Prisma models:

```prisma
model Module {
  id              String   @id @default(cuid())
  slug            String   @unique
  name            String
  version         String
  status          String   @default("active") // active | deprecated | retired
  manifestJson    Json
  installedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([status])
  @@map("module")
}

model TenantModule {
  organizationId  String
  moduleId        String
  enabled         Boolean  @default(false)
  configJson      Json?
  enabledAt       DateTime?
  enabledBy       String?
  @@id([organizationId, moduleId])
  @@index([organizationId])
  @@map("tenant_module")
}
```

A `ModuleRegistry` service wired in `app.module.ts` that:

1. **Scans `apps/api/src/modules/*/module.manifest.ts`** at boot.
2. **Validates each manifest** against a Zod schema declaring slug, version,
   dependencies, exposed hooks, declared permissions, declared custom-field
   definitions, and declared UI slots.
3. **Resolves the dependency graph** topologically; refuses to start if a module
   declares a dependency that is not installed at a compatible semver range.
4. **Upserts the `Module` row** with the latest manifest on every boot. Modules
   removed from the codebase are marked `retired` (not deleted — historical
   references in `TenantModule` and `AuditLog` must keep resolving).
5. **Exposes a guard** — `@RequireModule('workshop')` — that returns 404 if the
   active organisation has not enabled the module.
6. **Emits a `module.enabled` / `module.disabled` audit event** on every
   TenantModule mutation.

Manifest shape (Zod-defined in `@wa-kijo/shared`):

```ts
export const ModuleManifestSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  dependencies: z.record(z.string()).default({}), // { '@wa-kijo/booking-core': '^0.1.0' }
  exposes: z.object({
    permissions: z.array(z.string()).default([]),
    hooks: z.array(HookDefinitionSchema).default([]),
    customFields: z.array(CustomFieldDefinitionSchema).default([]),
    uiSlots: z.array(UiSlotDefinitionSchema).default([]),
    routes: z.array(z.string()).default([]),
  }),
  config: z.object({
    schema: z.unknown(), // Zod schema serialized as JSON
    defaults: z.record(z.unknown()).default({}),
  }),
  lifecycle: z
    .object({
      onInstall: z.string().optional(), // path to handler module
      onUpgrade: z.string().optional(),
      onUninstall: z.string().optional(),
    })
    .default({}),
});
```

The `module.manifest.ts` file in each module exports a typed object matching
this schema. The scanner uses the file's path to map module slug → source
location. There is no global "modules.json" — the manifest is the source of
truth, colocated with the module's code.

---

## Alternatives considered

### File-based-only registry (no DB tables)

- Simpler. Boot scans manifests; no `Module` / `TenantModule` rows.
- **Why rejected:** Per-tenant enable/disable is a runtime concern. A tenant
  cannot enable a module by editing source. Per-tenant config overrides need
  persistence too. Skipping the DB layer means reinventing a config store, and
  we already have Postgres.

### Plugin loaders that dynamically `require()` modules at runtime

- Maximum flexibility — tenants could install modules without redeploy.
- **Why rejected:** Security nightmare. Arbitrary code execution at runtime is
  hard to audit, hard to sandbox, and breaks our static Zod env validation.
  Customers who want third-party modules can request a signed plugin model later
  (post-1.0). For now, modules are compile-time additions, distributed by us.

### Microservices, one per module

- Strong isolation. Each module is an independent deployable.
- **Why rejected:** Deployment complexity explodes. Modules need to share auth,
  RBAC, audit, tenant context, and the Booking Core. Doing that across service
  boundaries means an internal API surface every module pair must agree on.
  wa-kijo's modular monolith — one process, many modules — keeps the operational
  story simple and the latency in-process. We can split later if a single module
  outgrows the monolith.

### Frappe / Odoo-style "everything is a Doctype" runtime metadata

- Schemas declared at runtime; UI generated from metadata.
- **Why rejected:** Powerful but completely incompatible with our
  TypeScript-first, type-safe, Prisma-validated stack. Buyers of wa-kijo pay
  specifically for type safety and a sharp DX. A runtime metadata model erodes
  both.

### NestJS Dynamic Modules with `forRoot/forFeature` only

- Use the framework's built-in mechanism; no separate registry.
- **Why rejected:** NestJS Dynamic Modules don't carry semver, manifest
  metadata, lifecycle hooks, or per-tenant enablement. Useful as an
  implementation detail (each business module _is_ a NestJS module);
  insufficient as the contract.

---

## Consequences

### Positive

- **One database, one auth, one billing configuration** per customer with N
  modules toggled on. The headline customer value of the platform pivot.
- **Dependency-resolved boot** catches incompatible module pairs before they hit
  production. No runtime surprises.
- **Per-tenant config isolation** — tenant A can enable Workshop with one
  config; tenant B with a completely different one. Stored per-tenant; never
  cross-leaks (BaseRepository already enforces this).
- **Module retirement preserves history** — disabling a module doesn't break
  audit logs that reference its events.

### Negative

- **Hook signatures and manifest shapes become public API.** Once shipped,
  breaking either is a major-version bump. We accept this as a feature, not a
  cost.
- **Cold start time grows linearly** with module count. The scanner runs once at
  boot; manifests are small. Acceptable budget: < 200 ms for 50 modules.
- **Two existing modules (`contacts`, `conversations`) must be refactored** to
  register via manifest before the platform tag ships. No new behaviour; just a
  `module.manifest.ts` per module.
- **A retired module's database rows linger** until a customer explicitly purges
  them via the admin UI. This is the right default (audit preservation) but
  requires UI affordance.

### Neutral

- We diverge further from "a typical NestJS app". A new contributor reading
  `app.module.ts` will not see every feature module imported there — the
  registry is the source of truth. Documented in `docs/architecture.md` once the
  registry ships.

---

## Implementation notes

### Where things live

```
apps/api/src/
├── modules/
│   ├── _template/                  # canonical scaffolding (next ADR)
│   ├── contacts/
│   │   ├── module.manifest.ts      # NEW — module declaration
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── conversations/
│       ├── module.manifest.ts
│       └── ...
├── platform/
│   └── module-registry/
│       ├── module-registry.module.ts
│       ├── module-registry.service.ts
│       ├── module-scanner.ts
│       ├── manifest.schema.ts
│       ├── dependency-resolver.ts
│       └── guards/
│           └── require-module.guard.ts
```

The `platform/` directory under `apps/api/src/` is new and holds the SaaS Core
Platform pieces (registry, hook bus, custom-field engine, slot system) that are
shared by every module.

### Manifest discovery

Use a glob — `apps/api/src/modules/*/module.manifest.ts` — at boot. Modules
under `_template/` are skipped (template, not real).

### Dependency resolution

Each manifest's `dependencies` map is `{ '@wa-kijo/booking-core': '^0.1.0' }`.
The resolver:

1. Builds a graph of module → declared dep ranges.
2. Looks up each dep's installed version (from package.json or another
   manifest's version field).
3. Validates with `semver.satisfies(installedVersion, declaredRange)`.
4. Detects cycles; refuses to start.

### Permission registration

Module manifests can declare new permissions (e.g.
`workshop:appointment:reschedule`). At boot the registry merges these into the
static `PERMISSIONS` map exposed by `@wa-kijo/shared`. Modules do not edit the
shared package — they declare permissions in their manifest, and the registry
assembles the runtime catalogue.

This means `hasPermission(role, permission)` becomes a runtime function backed
by the **assembled** catalogue, not the static map. ADR-0011 will fully detail
this.

### Versioning & upgrade

Modules follow SemVer:

- **Patch (0.1.0 → 0.1.1)** — bug fix; no manifest changes.
- **Minor (0.1.0 → 0.2.0)** — new hooks, new permissions, new tables;
  backwards-compatible.
- **Major (0.1.0 → 1.0.0)** — breaking change to a hook signature, permission
  rename, or destructive migration. Requires a customer CHANGELOG entry and an
  upgrade script.

Module version != wa-kijo platform version. A platform v0.6.0 ships
`workshop@0.1.0`; v0.7.0 may ship `workshop@0.2.0` while `tournament@0.1.0`
stays untouched.

### Migration story (existing modules)

Phase 6a refactor: `contacts` and `conversations` get a `module.manifest.ts`
each, declaring their existing permissions and no exposed hooks. Behaviour
unchanged. Zero customer-visible impact.

---

## Test gates

Per the testing rules and ADR-0009:

- **Manifest schema** has a unit test enumerating valid and invalid shapes
  (every required field, regex bounds, dep version range syntax).
- **Dependency resolver** has unit tests for: simple chain, diamond dependency,
  cycle detection, semver mismatch.
- **`@RequireModule()` guard** has an integration test asserting it returns 404
  (not 403) when the active org has not enabled the module — to maintain the
  cross-tenant non-disclosure principle.
- **Module retirement** integration test: disabling a module and asserting that
  an `AuditLog` row referencing it still resolves the module slug to a
  human-readable name.

---

## References

- Diagrams: Modular Enterprise SaaS Architecture (5-column flow); Module
  Lifecycle (Customize → Update → Fork).
- Related ADRs: 0001 (Better Auth — registry plugs into the existing permission
  catalogue), 0005 (BaseRepository — `TenantModule` queries go through it), 0007
  (BullMQ — module lifecycle events ride the events queue).
- External: Frappe Bench's app installation model, Strapi v4 plugin manifest,
  Shopify App Bridge App configuration.
