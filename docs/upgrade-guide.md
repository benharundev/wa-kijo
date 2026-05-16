# Upgrade guide

> **Audience:** customers upgrading from one wa'kijo release to the next.
>
> Each section covers a single major or minor release. Read every section
> between your current version and the target version, in order. Patch releases
> are listed in [`CHANGELOG.md`](../CHANGELOG.md) but rarely need upgrade steps
> beyond `git pull && pnpm install`.

---

## How to upgrade

The canonical upgrade procedure for any release:

```bash
# 1. Make sure you're on a clean working tree
git status

# 2. Take a database snapshot (production only)
pg_dump -Fc $DATABASE_URL > pre-upgrade-$(date +%F).dump

# 3. Pull the new release
git fetch origin && git checkout v<X.Y.Z>

# 4. Install dependencies
pnpm install

# 5. Read this guide for any sections between your old and new version
#    Apply manual steps in order

# 6. Apply migrations
pnpm db:migrate          # local dev
# or
pnpm db:migrate:deploy   # production

# 7. Rebuild shared packages and start the app
pnpm --filter @wa-kijo/shared build
pnpm --filter @wa-kijo/db build
pnpm dev                 # local
# or your production deploy command
```

If anything looks off, restore the snapshot:

```bash
pg_restore -d $DATABASE_URL --clean --if-exists pre-upgrade-YYYY-MM-DD.dump
git checkout v<previous>
pnpm install && pnpm <restart>
```

---

## Versioning policy

- **Major (`X.0.0`)** — breaking changes to public API, environment variables,
  or DB schema in a way that requires customer action. Released rarely.
- **Minor (`X.Y.0`)** — new functionality, additive schema changes, new optional
  env vars. Backwards-compatible.
- **Patch (`X.Y.Z`)** — bug fixes only. Always safe to upgrade.

Customers on Solo and Team tiers receive minor and patch releases for 6 / 12
months respectively. Agency and Enterprise customers receive at least one major
upgrade within their support window.

---

## v0.5.0 (released 2026-05-02)

> **Phase 5 milestone — domain feature modules complete.**

### What changed

- New modules: `contacts`, `tags`, `conversations`, `messages` mounted under
  `/api/v1/`.
- New `AuditLog` model and `AuditService`. Sensitive mutations (member role
  changes, org config updates, bulk operations) are recorded automatically.
- Cross-tenant access fuzz tests in CI.
- Bull-Board admin UI at `/admin/queues`, RBAC-gated.
- Scheduled jobs for soft-delete cleanup and audit log partitioning.
- CI workflow at `.github/workflows/ci.yml` runs typecheck, lint, unit,
  integration, e2e, and coverage thresholds.
- Static OpenAPI snapshot at `docs/api/openapi.yaml` regenerated via
  `pnpm api:openapi:dump`.
- Mintlify customer docs scaffolded under `docs-site/`.

### Required action

1. **Run migrations** to apply the new `Contact`, `Tag`, `Conversation`,
   `Message`, and `AuditLog` tables:
   ```bash
   pnpm db:migrate:deploy
   ```
2. **Add the new permissions** if you've customised
   `packages/shared/src/auth/permissions.ts`:
   - `contact:create`, `contact:read`, `contact:update`, `contact:delete`,
     `contact:import`, `contact:block`
   - `tag:create`, `tag:update`, `tag:delete`
   - `conversation:create`, `conversation:read`, `conversation:assign`,
     `conversation:close`, `conversation:delete`
   - `message:send`, `message:read`
   - `admin:queues` (for Bull-Board access)
3. **Seed dev** to repopulate the example data:
   ```bash
   pnpm db:seed
   ```
4. **Rebuild shared packages** after pulling — schema changes mean the Prisma
   client and shared DTOs both regenerate:
   ```bash
   pnpm --filter @wa-kijo/db build
   pnpm --filter @wa-kijo/shared build
   ```

### Optional

- Wire the new CI workflow into your fork's branch protection rules.
- Replace any wa'kijo placeholder copy under `apps/api/src/modules/contacts/`
  with your own product terminology before showing it to a customer.
- If you operate Bull-Board behind a reverse proxy, configure it to forward the
  session cookie — the admin UI requires a wa'kijo session to load.

### No breaking changes

This release is purely additive. v0.4.0 customers can pull and migrate without
touching application code.

---

## v0.5.0 → 1.0.0 (planned, not yet released)

Tentative release notes for the first stable release. Will be finalised when 1.0
ships.

### Breaking changes (planned)

- **Permission catalogue moved** from `packages/shared/src/auth/permissions.ts`
  into a database-backed table for tenant-defined custom roles.
  - Migration tool: `pnpm db:migrate:permissions` will seed the new table with
    the existing static catalogue. No customer action needed if you haven't
    customised the catalogue.
- **`@RequirePermission()` decorator** now accepts a string union derived from
  the seeded permissions; arbitrary strings will fail at typecheck time. Update
  any custom permissions to be added via the new admin API rather than
  hand-edited in source.
- **`/api/auth/sign-in/email` response shape**: error responses now follow the
  wa'kijo error envelope (`{ success: false, ... }`) instead of Better Auth's
  native shape. SDK consumers must update their error handling.

### New features (planned)

- TOTP-based MFA enrolment and challenge.
- Custom roles per organisation.
- Public API key authentication.
- Mintlify customer documentation site published at `docs.wakijo.dev`.

### Migration steps (planned)

```bash
# Backup
pg_dump -Fc $DATABASE_URL > pre-1.0.dump

# Pull and install
git checkout v1.0.0
pnpm install

# Migrate
pnpm db:migrate:deploy
pnpm db:migrate:permissions   # NEW step — seeds permission catalogue table

# Rebuild
pnpm --filter @wa-kijo/shared build
pnpm --filter @wa-kijo/db build
```

> **Estimated downtime for production deploy:** 2–5 minutes (one-time permission
> catalogue backfill). Schedule a maintenance window.

---

## v0.4.0 (released 2026-05-02)

> **Phase 4 milestone — frontend scaffold complete.**

### What changed

- Full Next.js 15 frontend scaffold added under `apps/web/`.
- shadcn/ui primitives, TanStack Query provider, Better Auth client,
  authenticated app shell, all auth pages, organisation and user settings pages.
- `useCan()` hook and `<Can />` component for client-side permission UX (server
  enforcement unchanged).
- Playwright E2E config that auto-starts the API and web.

### Required action

- Run `pnpm install` to pull in the new `apps/web` dependencies.
- If you ran `pnpm dev` previously and only had the API service running, you can
  keep doing so by filtering: `pnpm --filter @wa-kijo/api dev`.

### Optional

- Replace `--color-primary` and the logo for your brand before showing the web
  app to a customer (see [`customization.md`](customization.md) § 2).

### No schema changes

This release is frontend-only. No database migrations needed.

---

## v0.3.0 (released 2026-04-25)

> **Phase 3 milestone — auth and multi-tenancy complete.**

### What changed

- Better Auth ≥1.5 integrated with Fastify via `onRequest` hook at
  `/api/auth/*`.
- `Organization`, `Member`, `Invitation`, `Session` (with
  `activeOrganizationId`), `Account`, and `Verification` models added.
- `AuthGuard` and `PermissionGuard` registered globally via `APP_GUARD`.
- `@Public()`, `@CurrentUser()`, `@RequirePermission('resource:action')`
  decorators introduced.
- Email module added using Resend.
- 3-level org hierarchy and role inheritance.

### Required action

1. **Add the new env vars** to your production `.env` (see § Environment
   variables in [`runbook.md`](runbook.md) for the full list):
   - `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `BETTER_AUTH_URL` — public API URL, no trailing slash.
   - `RESEND_API_KEY`, `EMAIL_FROM`.
   - Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
2. **Run migrations:** `pnpm db:migrate:deploy`. The migration adds the Better
   Auth and organisation tables. **No data loss** — these are new tables.
3. **Seed dev:** locally, `pnpm db:seed` to create test users.
4. **Update any controllers** you wrote to add `@RequirePermission(...)` on each
   endpoint. Without it, every authenticated user can access the route. (This is
   a deliberate behaviour change — you should make every permission decision
   explicit.)
5. **Replace any direct Prisma calls** with calls through your repository class
   extending `BaseRepository<T>`. Direct calls bypass tenant scoping.

### Breaking change

- The `User` model gained `emailVerified Boolean @default(false)`. Existing
  users (if any from v0.2.0 dev data) need to be backfilled to
  `emailVerified=true` or they'll be unable to sign in:
  ```sql
  UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;
  ```

---

## v0.2.0 (released 2026-04-15)

> **Phase 2 milestone — NestJS API + Prisma scaffold complete.**

### What changed

- NestJS 11 application with Fastify adapter under `apps/api/`.
- Prisma 5 schema, `BaseRepository<T>` generic, `HttpExceptionFilter`,
  `TransformInterceptor`, Pino logging, BullMQ wiring, Swagger UI.
- Workspace packages `@wa-kijo/db` and `@wa-kijo/shared` introduced with
  conditional exports.

### Required action

1. **Update Node** to 22 LTS if you were on an earlier version.
2. **Install pnpm 9** via corepack: `corepack prepare pnpm@9.15.0 --activate`.
3. **Run migrations** to create the initial schema: `pnpm db:migrate`.
4. **Build the shared packages** before first dev run:
   `pnpm --filter @wa-kijo/shared build && pnpm --filter @wa-kijo/db build`.
   (`pnpm dev` does this automatically thereafter.)

### No breaking changes from v0.1.0

v0.1.0 was repo skeleton only — there's nothing to migrate.

---

## v0.1.0 (released 2026-04-01)

> **Phase 1 milestone — repository skeleton.**

Initial private release. No upgrade path; this is the starting point.

---

## Per-release upgrade notes — template

When releasing a new version, copy this template into a new section at the top
of this file:

```markdown
## v<X.Y.Z> (released YYYY-MM-DD)

### What changed

- _bullet point summary_

### Breaking changes

- _list each one and its mitigation_

### Required action

1. _step-by-step_

### Optional

- _cosmetic / opt-in changes_

### Estimated downtime

- _e.g. 0 (rolling), 2-5 min (migration window), > 30 min (data backfill)_
```

---

## Reading old upgrade notes

If you're skipping multiple versions (e.g. upgrading from v0.2.0 directly to
v1.0.0), apply each section's required actions in order. The
`pnpm db:migrate:deploy` step rolls every pending migration forward in sequence
— you don't need to run it once per version, just once at the end. Apply manual
code/env changes in version order regardless.
