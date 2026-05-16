# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

> **What this is:** Persistent project context loaded by Claude Code at every
> session. Keep it lean. Ad-hoc context goes in `docs/` and is referenced via
> `@docs/file.md` when needed.

## What wa'kijo is

A production-grade, opinionated **platform** for NestJS-first developers
building multi-tenant B2B SaaS. **This is a sellable product**, not a private
internal scaffold. Code quality, documentation, and consistency are P0 features,
not nice-to-haves.

Customers buy a private GitHub repo + Mintlify docs + 6–24 months of updates
depending on tier. wa'kijo ships as an **Apache-2.0 Community edition** plus
**five commercial tiers A–E** (Starter / Pro / Team / Enterprise / OEM). See
`@docs/prd.md` §8 for the full feature matrix, license terms, and pricing.
wa'lawe ships as a separate OSS reference repo (MIT) — running it requires
wa'kijo Pro (Tier B) or higher.

> **Strategic pivot (2026-05-10):** wa'kijo is evolving from a
> boilerplate-to-fork into a **platform with pluggable business modules**.
> Future products (wa'lawe chess tournaments, Workshop / wa-bengkel, etc.)
> ship as **modules on top of one shared platform** — not as separate forks.
> Forking is the **fallback** of last resort.
>
> The platform layers, in order: SaaS Core (auth, RBAC, tenancy, audit) →
> Module Registry (ADR-0008) → Shared Engines (Booking Core / ADR-0010) →
> Business Modules (wa'lawe, Workshop, …) → Customization Layer (Config,
> Custom Fields, Hooks, Policies, UI Slots).
>
> Read **ADR-0008, ADR-0009, ADR-0010** before designing anything new.

> **⚠ Reversed (2026-05-17):** the 2026-05-10 platform pivot above is
> rolled back for v1.0 scope. wa'kijo is now positioned as the
> **enterprise SaaS foundation under wa'lawe**, not a platform with
> pluggable modules. wa'lawe ships as a normal feature module inside the
> wa'kijo NestJS app. **Module Registry, Customization Layer, and kernel
> governance are dropped from v1.0.** Pragmatic DDD becomes a recommended
> internal pattern, not enforced kernel governance. Booking Core stays as
> the scheduling engine for wa'lawe but lives at
> `apps/api/src/modules/booking/` — no separate workspace package, no
> public API freeze, no SemVer ceremony.
>
> ADRs 0008 (Module Registry), 0009 (Pragmatic DDD), and 0010 (Booking
> Core kernel) are **partially superseded** by this narrowing. A
> follow-up ADR-0011 should formalize the reversal.

**See `@docs/prd.md` for full scope. See `@docs/architecture.md` for decision
rationale. ADRs 0008/0009/0010 in `@docs/decisions/` capture the original
platform pivot — read them as historical context, but the 2026-05-17
reversal above is the current source of truth.**

## Current phase status

> **Strategic re-sort (2026-05-17, final):** two decisions reshape the
> roadmap:
>
> 1. **Enterprise day-one positioning.** SSO/SCIM/SAML in P0, not P1.
>    Outbound webhooks + public API + API keys are core, not paid add-ons.
> 2. **wa'kijo + wa'lawe only, "engines first" build order (Path 2 + b).**
>    No platform thesis. No Module Registry. No Customization Layer. All
>    11 shared engines build into wa'kijo *before* wa'lawe development
>    starts. wa'lawe ships as a normal feature module inside wa'kijo.
>
> v1.0 estimate: **~15–22 months** from 2026-05-17. The wider range
> reflects the speculative-engine risk (Workflow, Report, Inventory
> Core, Invoice Core have no in-scope consumer — see "eyes-wide-open"
> note below).

| Phase     | Epoch                                | Scope                                                                                                                                                            | Status         |
| --------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1         | Foundation                           | Repo skeleton, tooling, Docker Compose, tsconfig                                                                                                                 | ✅ Complete    |
| 2         | Foundation                           | NestJS API scaffold, Prisma schema, BaseRepository                                                                                                               | ✅ Complete    |
| 3         | Foundation                           | Better Auth, multi-tenant org hierarchy                                                                                                                          | ✅ Complete    |
| 4         | Foundation                           | Next.js frontend scaffold                                                                                                                                        | ✅ Complete    |
| 5         | Foundation                           | Domain feature modules (contacts, conversations, messages, tags, audit log)                                                                                      | ✅ Complete    |
| **6**     | **A · Platform Hardening**           | Audit engine (hardening) · Storage engine · MFA/2FA · SSO (SAML+OIDC) · SCIM 2.0 · session mgmt UI · impersonation · IP allowlist · org lifecycle · maintenance mode | 🚧 In progress |
| **7**     | **B · Compliance & DX**              | OpenTelemetry · metrics · Sentry · GDPR export · right-to-delete · field-level encryption · retention policies · OpenAPI auto-gen · public API + keys · outbound webhooks | Planned        |
| **8**     | **C · Commerce & White-Label**       | Notification engine · Communication engine · usage metering · quota enforcement · invoices/receipts UI · tax/VAT · manual invoicing · custom domains · white-labeling · full i18n | Planned        |
| **9**     | **D · Engines Build-out**            | **Booking Core** (with Availability folded in) · **Workflow** · **Document** · **Report** · **Inventory Core** · **Invoice Core**. Engines-only — no business module yet | Planned        |
| **10**    | **E · wa'lawe + v1.0 GA**            | **wa'lawe (chess tournaments)** built on the completed engine foundation · super-admin console full · tenant lifecycle ops · sandbox/test mode · TypeScript SDK · Bull-Board with RBAC · Mintlify customer docs at `docs.wakijo.dev` · v1.0 Enterprise GA tag | Planned        |
| **Post-1.0** | —                                 | Second business module (TBD) · search (Postgres FTS → Meilisearch) · push notifications · Python SDK · trusted device mgmt · brand kit · coupons/promo · dunning · data residency | Backlog        |

Phases 1–5 are complete. The API has: `health/`, `contacts/`,
`conversations/`, `billing/` (Stripe + Billplz + Curlec providers),
`queues/` (BullMQ), `audit log`, and cross-tenant fuzz tests, plus the
full auth/context infrastructure. The frontend billing UI at
`apps/web/src/app/(app)/orgs/[orgId]/billing/page.tsx` is currently a stub
awaiting the plan selection and checkout flow.

**Phase 6 is the new critical path.** Audit engine hardening + Storage
engine must ship first — every downstream phase writes files and audit
events. The existing Booking Core kernel scaffold (was 6b) and Pragmatic
DDD `_template/` (was 6c) stay in the repo as architectural patterns but
are no longer load-bearing kernel governance — they get folded into
Phase 9's engines build-out as regular NestJS modules.

**Engines first, wa'lawe second.** All 11 shared engines must complete
before any wa'lawe code is written:

- **Phase 6 engines:** Audit, Storage (P0 SaaS Core, needed regardless of modules)
- **Phase 8 engines:** Notification, Communication (pair with commerce UX work)
- **Phase 9 engines:** Booking Core (+Availability), Workflow, Document, Report, Inventory Core, Invoice Core (built before any consumer exists)
- **Phase 10 module:** wa'lawe consumes the engines, validates abstractions, ships with v1.0 GA polish

**⚠ Eyes-wide-open caveat (recorded 2026-05-17).** Under the (b) scope
narrowing, four of the 11 engines have no in-scope consumer in v1.0:

- **Workflow** — wa'lawe's lifecycle is a simple 5-state machine that
  could live inline
- **Report** — wa'lawe standings live inside wa'lawe
- **Inventory Core** — no wa-stok in scope
- **Invoice Core** — no wa-invois in scope; platform Billing handles SaaS subs

These four are built speculatively because the user explicitly chose
Path 2 ("build complete engine foundation first"). Acceptable trade-off
if the goal is a feel-complete foundation; high risk that 1–2 of these
need refactoring if a real consumer ever arrives. **Do not invent
abstractions you can't validate** — when in doubt while building these
four, prefer the simplest schema and clearest extension point over
elegance. Future consumers will tell you what was actually needed.

**Shared engines packaging (locked 2026-05-17):** none of the 11
engines ship as workspace packages in v1.0. All live as in-API NestJS
modules under `apps/api/src/modules/`. The existing
`@wa-kijo/booking-core` workspace package is rolled back into
`apps/api/src/modules/booking/`. Workspace-package promotion is a
post-v1.0 decision triggered by an actual second module needing
independent SemVer.

**Open decisions:**

- **SSO/SCIM build vs buy** — WorkOS ($125/connection/month, ships SSO +
  SCIM + Directory Sync + Audit Logs as one integration, ~6–8 weeks faster
  to enterprise-ready) vs roll-your-own. No ADR yet.
- **ADR-0011 follow-up** — write a new ADR that formally supersedes the
  platform-thesis portions of ADR-0008, 0009, 0010 and records the (b) +
  Path 2 decision with rationale.
- **Speculative-engine scope** — Workflow, Report, Inventory Core, Invoice
  Core have no in-scope consumer. Open question: build them as thin
  abstract-stub kernels (cheap, may need refactor) or as fuller speculative
  designs (expensive, higher refactor risk)? Recommend thin stubs.

## Tech stack — non-negotiable

- **Backend:** NestJS 11 (Fastify adapter, NOT Express) + Prisma 5 + PostgreSQL
  16
- **Auth:** Better Auth ≥1.5 with extended organisation plugin (parent–child
  hierarchy, `orgType` field)
- **Frontend:** Next.js 15 (App Router) + shadcn/ui + Tailwind + TanStack Query
- **Validation:** Zod end-to-end (DTOs, env, forms — single source of truth)
- **Jobs:** BullMQ + Redis 7
- **Email:** Resend + React Email
- **Billing:** Stripe (default) + Billplz + Curlec/Razorpay (Malaysian) behind a
  common `BillingProvider` interface
- **Package manager:** pnpm 9. Always.
- **Node:** 22 LTS. Enforced via `engines`.

## Project structure

```
wa-kijo/
├── apps/
│   ├── api/src/
│   │   ├── main.ts               # Fastify bootstrap + Better Auth hooks
│   │   ├── app.module.ts
│   │   ├── auth/                 # Better Auth factory + AuthService
│   │   ├── base/                 # BaseRepository<T> (extend for every repo)
│   │   ├── common/
│   │   │   ├── context/          # AsyncLocalStorage RequestContext store
│   │   │   ├── decorators/       # @Public(), @CurrentUser(), @RequirePermission()
│   │   │   ├── filters/          # HttpExceptionFilter
│   │   │   ├── guards/           # AuthGuard (APP_GUARD #1), PermissionGuard (#2)
│   │   │   ├── interceptors/     # TransformInterceptor
│   │   │   └── logger/           # Pino-based logger; suppresses noisy wildcard-route warning
│   │   ├── config/               # EnvService (Zod-validated, @Global)
│   │   ├── prisma/               # PrismaModule + PrismaService (@Global)
│   │   ├── queues/
│   │   │   ├── jobs/             # Job payload types (TypeScript interfaces only)
│   │   │   ├── processors/       # BullMQ Processor classes (one per queue)
│   │   │   ├── queue.names.ts    # QUEUE_NAMES constant — single source of queue name strings
│   │   │   └── queues.module.ts  # BullModule.forRootAsync + registerQueue + re-exports
│   │   ├── redis/                # RedisModule (@Global)
│   │   └── modules/              # health/, email/, contacts/, conversations/, billing/
│   └── web/src/
│       ├── app/(auth)/           # sign-in, sign-up, magic-link, reset-password
│       ├── app/(app)/            # authenticated shell: dashboard, orgs/[orgId], settings
│       ├── components/layout/    # Sidebar, TopBar, OrgSwitcher, UserMenu
│       ├── components/ui/        # shadcn/ui primitives
│       ├── hooks/                # use-can.ts, use-session.ts, use-toast.ts
│       ├── lib/                  # auth-client.ts, fetcher.ts
│       └── providers/            # QueryProvider, ThemeProvider
├── packages/
│   ├── db/prisma/schema.prisma   # Single Prisma schema (Better Auth models + custom)
│   └── shared/src/
│       ├── auth/                 # roles.ts, permissions.ts, can.types.ts
│       └── dto/                  # Zod schemas reused by API and web
├── docs/decisions/               # ADRs — 0001 through 0007 (see list in docs/decisions/)
├── docs-site/                    # Mintlify customer-facing docs site
└── .claude/rules/                # backend.md, frontend.md, testing.md, security.md
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
- ❌ Write unicode bullets `•` directly when generating docx in tools (use
  proper list formatting).

## Build commands

```bash
# First-time local setup
cp .env.example .env
pnpm install              # postinstall auto-runs prisma generate
pnpm docker:up            # start Postgres 16 + Redis 7
pnpm db:migrate           # apply migrations (name prompt: "init_schema")
# Note: ports default to 5434 (Postgres) and 6381 (Redis) to avoid
# conflicts with other local services (see .env.example).

# Day-to-day
pnpm dev                  # run api + web with hot reload
pnpm build                # production build (both apps)
pnpm test                 # unit tests (Vitest, all packages)
pnpm test:integration     # integration tests with Testcontainers (real Postgres, serial)
pnpm test:e2e             # Playwright (starts api + web servers automatically)
pnpm lint                 # ESLint + Prettier check
pnpm typecheck            # tsc --noEmit
pnpm format               # auto-format all files
pnpm format:check         # Prettier check only (no writes — CI-safe)
pnpm clean                # rm -rf all dist/, .next/, .turbo/, node_modules/ across the monorepo

# Run a single test file
pnpm --filter @wa-kijo/api test -- --run src/modules/contacts/contacts.service.spec.ts

# Database
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # seed dev data
pnpm db:studio            # open Prisma Studio

# Docker helpers
pnpm docker:up            # start dev containers (detached)
pnpm docker:down          # stop dev containers
pnpm docker:logs          # tail container logs

# Docs site (Mintlify)
pnpm docs:dev             # Mintlify dev server
pnpm docs:pdf             # generate PDF handbook
```

## Auth & request context architecture

This is the most non-obvious part of the codebase — it spans 5+ files.

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

18 models in `packages/db/prisma/schema.prisma`, grouped by domain:

| Group                                             | Models                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| Auth (Better Auth — field names fixed by adapter) | `User`, `Session`, `Account`, `Verification`              |
| Tenancy                                           | `Organization`, `Member`, `Invitation`                    |
| Domain                                            | `Contact`, `Tag`, `ContactTag`, `Conversation`, `Message` |
| Billing                                           | `Plan`, `Subscription`                                    |

Key schema conventions:

- All soft-deletable models carry `deletedAt DateTime?` + `deletedBy String?`.
- `role` and `status` fields are `String`, not Prisma enums — required for
  Better Auth adapter compatibility.
- `organizationId` is denormalized onto `Message` so tenant-scoped queries never
  need a join through `Conversation`.
- `Plan` stores provider price IDs (`stripePriceMonthlyId`,
  `stripePriceYearlyId`, `curlecPlanId`, `billplzCollectionId`) — one row covers
  all three payment providers.
- `Subscription` has `@unique(organizationId)` — one subscription per org,
  upserted by webhook handlers.
- `Contact.phone` uniqueness is enforced per-org in the service layer (E.164
  format), not at the DB level.

## BillingProvider interface (Phase 6 extension point)

`apps/api/src/modules/billing/billing.provider.interface.ts` defines the
contract every payment gateway must implement. Three concrete providers are
complete:

| Symbol                     | Implementation           | Notes                                         |
| -------------------------- | ------------------------ | --------------------------------------------- |
| `BILLING_STRIPE_PROVIDER`  | `StripeBillingProvider`  | Subscriptions + Customer Portal, 14-day trial |
| `BILLING_BILLPLZ_PROVIDER` | `BillplzBillingProvider` | Malaysian FPX bills, no portal concept        |
| `BILLING_CURLEC_PROVIDER`  | `CurlecBillingProvider`  | Razorpay direct debit                         |

All providers implement `ensureCustomer`, `createCheckoutSession`,
`createPortalSession`, and `handleWebhook`. `BillingService.getProvider(name)`
selects the correct instance at runtime and throws `BadRequestException` if the
provider's env vars are not configured.

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

`packages/shared` and `packages/db` are source-first packages. They use
**conditional exports**: TypeScript resolves the `types` condition (`.ts`
source), Node.js resolves the `require` condition (`dist/` CJS build). Before
starting the API in dev mode, both packages are auto-built by the dev script
(`pnpm dev` handles this). After editing code in a workspace package, run
`pnpm --filter @wa-kijo/shared build` (or `@wa-kijo/db`) to update the CJS
output — otherwise the running API still sees the old compiled version.

## TypeScript config

`tsconfig.base.json` at the root applies to all packages. Key settings future
Claude instances must know when scaffolding backend code:

- `target: ES2022`, `module: NodeNext`
- `experimentalDecorators: true` + `emitDecoratorMetadata: true` — required for
  NestJS dependency injection
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
- Specific feature requirements → `@docs/prd.md` (search by FR-XXX ID)
- API design conventions → `@docs/api-conventions.md` (URL structure,
  pagination, HTTP status codes)
- Backend code rules → `@.claude/rules/backend.md`
- Security patterns → `@.claude/rules/security.md`
- Observability (logs, metrics, tracing) → `@docs/observability.md`
- Operational procedures → `@docs/runbook.md`
- Customizing the boilerplate → `@docs/customization.md`
- Upgrading between releases → `@docs/upgrade-guide.md`
- Term definitions → `@docs/glossary.md`
