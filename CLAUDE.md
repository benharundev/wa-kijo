# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

> **What this is:** Persistent project context loaded by Claude Code at every
> session. Keep it lean. Ad-hoc context goes in `docs/` and is referenced via
> `@docs/file.md` when needed.

## What wa'kijo is

A production-grade, opinionated **SaaS foundation** for NestJS-first developers
building multi-tenant B2B products. **This is a sellable product**, not a
private internal scaffold — code quality, documentation, and consistency are P0
features. Licensed under **Apache 2.0**.

For v1.0, wa'kijo is positioned as the **enterprise SaaS foundation under
wa'lawe** (chess tournaments). wa'lawe ships as a normal NestJS feature module
inside the wa'kijo app. **No Module Registry, no Customization Layer, no kernel
governance.** The earlier "platform with pluggable modules" thesis from
2026-05-10 was rolled back on 2026-05-17.

- Current source of truth on scope:
  `@docs/decisions/0011-reverse-platform-pivot.md`
- Superseded (historical context): ADRs 0008, 0009, 0010
- Full product scope and feature IDs: `@docs/prd.md`
- Decision rationale across the stack: `@docs/architecture.md`

## Current phase status

Phases 1–5 complete (foundation, API scaffold, Better Auth + multi-tenant orgs,
Next.js shell, domain feature modules). **Phase 6 (Platform Hardening) is in
progress** — audit-engine hardening and the storage engine are the critical
path; every downstream phase writes files and audit events.

Full phase table, engine-build ordering, speculative-engine caveats, and open
decisions live in `@docs/roadmap.md`.

## Tech stack — non-negotiable

- **Backend:** NestJS 11 (Fastify adapter, NOT Express) + Prisma 5 + PostgreSQL
  16
- **Auth:** Better Auth ≥1.5 with extended organisation plugin (parent–child
  hierarchy, `orgType` field)
- **Frontend:** Next.js 15 (App Router) + shadcn/ui + Tailwind + TanStack Query
- **Validation:** Zod end-to-end (DTOs, env, forms — single source of truth)
- **Jobs:** BullMQ + Redis 7
- **Email:** Resend + React Email
- **Billing:** Stripe (wired). Billplz + Curlec/Razorpay (Malaysian) are planned
  for Phase 8 behind the same `BillingProvider` interface.
- **Package manager:** pnpm 9. Always.
- **Node:** 22 LTS. Enforced via `engines`.

## Project structure

```
wa-kijo/
├── apps/
│   ├── api/src/
│   │   ├── main.ts               # Fastify bootstrap + Better Auth hooks
│   │   ├── auth/                 # Better Auth factory + AuthService
│   │   ├── base/                 # BaseRepository<T> — extend for every repo
│   │   ├── common/{context,decorators,filters,guards,interceptors,logger}/
│   │   ├── config/               # EnvService (Zod-validated, @Global)
│   │   ├── prisma/               # PrismaModule + PrismaService (@Global)
│   │   ├── queues/               # BullMQ jobs/, processors/, queue.names.ts
│   │   ├── redis/                # RedisModule (@Global)
│   │   └── modules/              # health/, email/, contacts/, conversations/, billing/
│   └── web/src/
│       ├── app/{(auth),(app)}/   # auth pages + authenticated shell
│       ├── components/{layout,ui}/
│       ├── hooks/                # use-can, use-session, use-toast
│       ├── lib/                  # auth-client.ts, fetcher.ts
│       └── providers/            # QueryProvider, ThemeProvider
├── packages/
│   ├── db/prisma/schema.prisma   # single Prisma schema (Better Auth + custom)
│   └── shared/src/{auth,dto}/    # roles, permissions, Zod DTOs
├── docs/decisions/               # ADRs 0001–0011
└── .claude/rules/                # backend.md, frontend.md, security.md, testing.md
```

## Always do these

1. **Use the BaseRepository pattern** for all data access. See the
   `nestjs-prisma` skill for the canonical implementation.
2. **Soft delete by default.** No hard deletes outside explicit cleanup jobs.
3. **Audit log all mutations** on flagged entities via Prisma middleware.
4. **Tenant-scope every query** via the BaseRepository's tenant middleware. No
   raw `prisma.<model>.findMany` outside of admin/system code.
5. **Cursor pagination** for any list endpoint that could grow past 1k rows.
   Offset pagination is admin-only.
6. **Zod schemas in `packages/shared/`** are the single source of truth for
   types. Don't duplicate in api or web.
7. **Strict TypeScript.** No `any`. If you really need to escape, use `unknown`
   and narrow.
8. **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
   `chore:`. Enforced via commitlint.
9. **Document architectural decisions** as ADRs in
   `docs/decisions/NNNN-title.md`. Future buyers will read these.

## Never do these

- ❌ Hand-edit Prisma migrations. Always use `prisma migrate`.
- ❌ Hard-code English strings. All user-facing text goes through i18n.
- ❌ Use `prisma.$queryRaw` without a comment explaining why and a soak test.
- ❌ Add a runtime dependency without justifying it in the PR description.
- ❌ Skip tests on auth, billing, or tenant-isolation code paths.

## Build commands

```bash
# First-time local setup
cp .env.example .env
pnpm install              # postinstall auto-runs prisma generate
pnpm docker:up            # start Postgres 16 + Redis 7
pnpm db:migrate           # apply migrations
# Ports default to 5434 (Postgres) / 6381 (Redis) to avoid conflicts.

# Day-to-day
pnpm dev                  # run api + web with hot reload
pnpm build                # production build (both apps)
pnpm test                 # unit tests (Vitest)
pnpm test:integration     # integration tests via Testcontainers (real Postgres, serial)
pnpm test:e2e             # Playwright (starts api + web automatically)
pnpm lint                 # ESLint + Prettier check
pnpm typecheck            # tsc --noEmit
pnpm format               # auto-format
pnpm format:check         # Prettier check only (CI-safe)
pnpm clean                # rm dist/, .next/, .turbo/, node_modules/ everywhere

# Run a single test file
pnpm --filter @wa-kijo/api test -- --run src/modules/contacts/contacts.service.spec.ts

# Database
pnpm db:generate          # regenerate Prisma client
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # seed dev data
pnpm db:studio            # open Prisma Studio

# Docker + docs
pnpm docker:up | docker:down | docker:logs
pnpm docs:dev             # Mintlify dev server (customer docs)
pnpm docs:pdf             # generate PDF handbook
```

## Auth & request context architecture

The most non-obvious part of the codebase — it spans 5+ files.

**Request lifecycle (every authenticated HTTP call):**

```
Fastify onRequest hook #1  → AsyncLocalStorage.run({ requestId, userId:'', orgId:'' … })
Fastify onRequest hook #2  → /api/auth/* caught here → Better Auth handler, exits Fastify
                              (all other routes fall through to NestJS pipeline)
NestJS APP_GUARD #1        → AuthGuard: validates session cookie via Better Auth,
                              calls AuthService.resolveContext() to populate the store
NestJS APP_GUARD #2        → PermissionGuard: reads @RequirePermission metadata,
                              checks PERMISSIONS[key].includes(ctx.userRole)
Controller / Service       → reads RequestContext via getRequestContext() anywhere in chain
BaseRepository             → auto-scopes every query to ctx.orgId
```

**Key files:**

- `apps/api/src/main.ts` — Fastify hook setup (hooks #1 and #2)
- `apps/api/src/common/context/request-context.ts` — AsyncLocalStorage store
  shape
- `apps/api/src/auth/auth.service.ts` — `resolveContext()` +
  `resolveEffectiveRole()`
- `apps/api/src/common/guards/auth.guard.ts` — session validation, store
  population
- `apps/api/src/common/guards/permission.guard.ts` — RBAC enforcement

**Hierarchy role resolution:** a user with `owner` role in a parent AGENCY org
automatically receives `owner` authority in all child WORKSPACEs. Depth limit is
3 levels (enforced in `AuthService`). `@Public()` bypasses both guards.

## API response envelope

All responses are wrapped by `TransformInterceptor`. Frontend `fetcher.ts`
expects this shape:

```json
// Success
{ "success": true, "data": { ... }, "timestamp": "2026-05-02T..." }

// Error (HttpExceptionFilter)
{ "success": false, "statusCode": 422, "error": "VALIDATION_ERROR", "message": "...", "timestamp": "..." }
```

`fetcher.ts` throws `ApiError` (with `code`, `message`, `fields`) on non-2xx. On
401 it auto-redirects to `/sign-in`.

## Prisma data models

**14 models** in `packages/db/prisma/schema.prisma`, grouped by domain:

| Group                                             | Models                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| Auth (Better Auth — field names fixed by adapter) | `User`, `Session`, `Account`, `Verification`              |
| Tenancy                                           | `Organization`, `Member`, `Invitation`                    |
| Domain                                            | `Contact`, `Tag`, `ContactTag`, `Conversation`, `Message` |
| Billing                                           | `Plan`, `Subscription`                                    |

> ADR-0011 removed the `Module` and `TenantModule` rows that briefly existed for
> the platform-registry thesis (2026-05-10 → 2026-05-17).

Key schema conventions:

- All soft-deletable models carry `deletedAt DateTime?` + `deletedBy String?`.
- `role` and `status` fields are `String`, not Prisma enums — required for
  Better Auth adapter compatibility.
- `organizationId` is denormalized onto `Message` so tenant-scoped queries never
  need a join through `Conversation`.
- `Plan` stores provider price IDs (`stripePriceMonthlyId`,
  `stripePriceYearlyId`, `curlecPlanId`, `billplzCollectionId`) — one row will
  cover all three payment providers once Billplz/Curlec ship.
- `Subscription` has `@unique(organizationId)` — one subscription per org,
  upserted by webhook handlers.
- `Contact.phone` uniqueness is enforced per-org in the service layer (E.164
  format), not at the DB level.

## BillingProvider interface

`apps/api/src/modules/billing/billing.provider.interface.ts` defines the
contract every payment gateway must implement. The interface is intentionally
provider-agnostic — `providerName: 'stripe' | 'billplz' | 'curlec'` is kept open
— but **only Stripe is wired today**.

| Symbol                    | Implementation          | Notes                                         |
| ------------------------- | ----------------------- | --------------------------------------------- |
| `BILLING_STRIPE_PROVIDER` | `StripeBillingProvider` | Subscriptions + Customer Portal, 14-day trial |
| _Billplz_                 | _Planned (Phase 8)_     | Malaysian FPX bills, no portal concept        |
| _Curlec_                  | _Planned (Phase 8)_     | Razorpay direct debit                         |

`BillingService.getProvider(name)` selects the correct instance at runtime and
throws `BadRequestException` if the provider's env vars are not configured
(today that means anything other than `stripe`).

**Phase 6 channel providers (Meta WhatsApp, SMTP, SMS) are separate from
billing.** The stub to replace is `MessageDispatchProcessor` in
`apps/api/src/queues/processors/message-dispatch.processor.ts` — it routes by
`job.data.channel` (`whatsapp | email | sms`) and currently marks every job
`sent` with a placeholder `externalId`.

## Integration test patterns

Integration tests live in `apps/api/test/integration/` and run against a real
Postgres container. Use `pnpm test:integration` (serial — one container at a
time).

**Setup (`setup/testcontainers.ts`):** Launches `postgres:16-alpine` via
Testcontainers, runs `prisma migrate deploy`, returns `{ prisma, container }`.
Call `teardownTestDb(db)` in `afterAll`.

**Factories (`setup/test-factories.ts`):** Write directly via Prisma (bypass
Better Auth HTTP). Never import in production code.

- `createTestTenant(prisma, opts?)` — one call creates org + user + member,
  returns `{ org, user, member }`. Use this by default.
- `createTestOrg`, `createTestUser`, `createTestMember` — lower-level primitives
  for edge cases.

**`makeCtx` helper (copy into each spec file):**

```typescript
function makeCtx(userId: string, orgId: string): RequestContext {
  return {
    userId,
    orgId,
    orgType: 'WORKSPACE',
    userRole: 'admin',
    globalRole: 'user',
    requestId: 'test-request',
  };
}
```

**Tenant isolation tests:**
`apps/api/test/integration/tenant-isolation/cross-tenant.spec.ts` is the
canonical reference. Every new repository must assert that cross-org `findById`
returns `null` (not an error) and `findAll` returns only own-org records.

## Workspace package build pattern

`packages/shared` and `packages/db` are source-first packages with **conditional
exports**: TypeScript resolves the `types` condition (`.ts` source), Node.js
resolves the `require` condition (`dist/` CJS build). Before starting the API in
dev mode, both packages are auto-built by the dev script (`pnpm dev` handles
this). After editing code in a workspace package, run
`pnpm --filter @wa-kijo/shared build` (or `@wa-kijo/db`) to update the CJS
output — otherwise the running API still sees the old compiled version.

## TypeScript config

`tsconfig.base.json` at the root applies to all packages. Two settings are
load-bearing for backend code:

- `experimentalDecorators` + `emitDecoratorMetadata` — required for NestJS
  dependency injection
- `strict: true` — no implicit any, strict null checks enforced

## Skills to consult

- `nestjs-prisma` — every backend module
- `nestjs-better-auth` — anything auth or org-related
- `frontend-design` — every new page or component
- `webapp-testing` — E2E test scaffolding

## What this product is NOT

- Not a Next.js fullstack starter. We have a separable NestJS backend.
- Not a CMS or marketing-site builder.
- Not opinion-free. Buyers who want zero opinions should buy something else.
- Not Express/Hono/Drizzle/MongoDB. Stack is fixed.

## Where to look first when stuck

- Architecture rationale → `@docs/architecture.md`
- Roadmap, phases, engine order → `@docs/roadmap.md`
- Specific feature requirements → `@docs/prd.md` (search by FR-XXX ID)
- API design conventions → `@docs/api-conventions.md` (URL structure,
  pagination, HTTP status codes)
- Backend code rules → `@.claude/rules/backend.md`
- Security patterns → `@.claude/rules/security.md`
- Testing conventions → `@.claude/rules/testing.md`
- Observability (logs, metrics, tracing) → `@docs/observability.md`
- Operational procedures → `@docs/runbook.md`
- Customizing the boilerplate → `@docs/customization.md`
- Upgrading between releases → `@docs/upgrade-guide.md`
- Term definitions → `@docs/glossary.md`
