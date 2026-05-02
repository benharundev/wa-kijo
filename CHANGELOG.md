# Changelog

All notable changes to wa'kijo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Customer-relevant entries are also published in
> [`docs-site/changelog.mdx`](docs-site/changelog.mdx). When adding an entry
> here, mirror it there if it affects the public API, environment variables,
> or upgrade path.

---

## [Unreleased]

### Added

- _(add new entries here as they land on `main`)_

### Changed

- _nothing yet_

### Deprecated

- _nothing yet_

### Removed

- _nothing yet_

### Fixed

- _nothing yet_

### Security

- _nothing yet_

---

## [0.5.0] - 2026-05-02

> **Phase 5 milestone — domain feature modules complete.**

### Added

- **Contacts module** — `apps/api/src/modules/contacts/` with CRUD,
  search, tag assignment, blocked-flag handling. E.164 phone validation
  via the shared `CreateContactSchema`.
- **Tags module** — per-organisation tag CRUD, exposed at `/api/v1/tags`,
  reusable across the contacts surface.
- **Conversations module** — `/api/v1/conversations` with open / close /
  snooze state machine, channel-agnostic, conversation-per-contact
  uniqueness enforced.
- **Messages module** — `/api/v1/conversations/:id/messages` with
  inbound/outbound direction, status lifecycle (`queued → sending →
  delivered | failed`), and BullMQ-dispatched outbound delivery.
- **Bulk contact import** — CSV upload endpoint with per-row validation,
  rate-limited to 5 imports / org / hour.
- **Audit log** — `AuditLog` Prisma model and `AuditService`. Member
  role changes, org-level config updates, and bulk operations are
  recorded automatically via Prisma middleware.
- **Cross-tenant access fuzz suite** — every repository now ships with
  an integration test asserting that requests from org A cannot read,
  update, or soft-delete data in org B. Wired into `pnpm test:integration`
  and CI.
- **CI pipeline** — `.github/workflows/ci.yml` runs typecheck, lint,
  unit, integration (with Postgres + Redis service containers), e2e,
  and coverage threshold checks on every PR.
- **OpenAPI snapshot** — static `docs/api/openapi.yaml` exported on
  every release (and reviewable in PRs that add or change endpoints)
  via the new `pnpm api:openapi:dump` script.
- **Bull-Board** — mounted at `/admin/queues`, gated by
  `@RequirePermission('admin:queues')`.
- **Scheduled jobs** — cron-triggered cleanup of soft-deleted records
  older than 30 days and daily audit log partition rotation.

### Changed

- `Member.role` change events are now persisted to `AuditLog` in
  addition to the existing log line.
- Default cursor pagination limit raised from 20 to 25 across list
  endpoints.

### Documentation

- Customer-facing **Mintlify handbook** scaffolded under `docs-site/`
  (concepts, guides, reference, troubleshooting).
- New ADRs: `0002` (pnpm monorepo), `0003` (Fastify over Express),
  `0004` (Zod end-to-end), `0005` (BaseRepository tenant scoping),
  `0006` (Mintlify for customer docs), `0007` (BullMQ for jobs).
- New internal docs: `docs/prd.md`, `docs/api-conventions.md`,
  `docs/deployment.md`, `docs/observability.md`,
  `docs/customization.md`, `docs/upgrade-guide.md`,
  `docs/glossary.md`, `docs/testing.md`.
- Repo policy files: `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `LICENSE` (commercial draft).

### Security

- Cross-tenant access fuzz suite (above) — closes the largest open
  risk class identified in the Phase 4 review.
- Webhook ingest helper utility added in preparation for Phase 6
  billing webhooks.

---

## [0.4.0] - 2026-05-02

> **Phase 4 milestone — frontend scaffold complete.**

### Added

- **Frontend** — Next.js 15 App Router scaffold under `apps/web/`:
  - Public auth pages: sign-in, sign-up, magic-link request and verify,
    password reset request and confirm.
  - Authenticated shell with sidebar, top bar, organisation switcher, user
    menu, theme toggle.
  - Dashboard, organisation settings (members, invites, billing), user
    settings (profile, sessions, notifications, danger zone).
  - shadcn/ui primitives (button, input, card, dialog, dropdown, select,
    label, badge, separator, avatar, toast, tooltip).
  - TanStack Query provider with auth-aware fetcher (`credentials:
    'include'`, 401-redirect, typed `ApiError`).
  - Server-side session guard in `(app)/layout.tsx`.
  - Better Auth client (`@/lib/auth-client`) for `useSession()`,
    `signIn`, `signOut`.
- **Frontend RBAC hint:** `useCan()` hook and `<Can do="permission">`
  component (UX only — server `@RequirePermission` remains the security
  boundary).
- **Playwright** E2E config that auto-starts API + web servers.

### Changed

- Bumped `better-auth` to `^1.6.9`.
- Lowered Postgres dev port to `5434` and Redis to `6381` in `.env.example`
  to avoid clashes with locally-installed Postgres / Redis.

### Documentation

- New `docs/runbook.md` — day-to-day local development reference.
- New `docs/architecture.md` — system design and request lifecycle.
- New `ADR-0001` — Better Auth with parent-child organisation hierarchy.

---

## [0.3.0] - 2026-04-25

> **Phase 3 milestone — auth and multi-tenancy complete.**

### Added

- **Better Auth ≥1.5** integration mounted via Fastify `onRequest` hook at
  `/api/auth/*`, bypassing NestJS body parsing so Better Auth reads the raw
  request stream.
- **Organisation plugin** with extended schema (`parentOrgId`, `orgType`)
  supporting a 3-level `SYSTEM → AGENCY → WORKSPACE` hierarchy.
- **AsyncLocalStorage `RequestContext`** populated by `AuthGuard` and
  consumed by `BaseRepository` for automatic tenant scoping.
- **`AuthGuard`** (APP_GUARD #1) — validates session cookie and resolves the
  request context.
- **`PermissionGuard`** (APP_GUARD #2) — enforces
  `@RequirePermission('resource:action')` against the static `PERMISSIONS`
  map in `@wa-kijo/shared`.
- **Hierarchy role inheritance** — an `owner` in a parent AGENCY org receives
  `owner` authority in all child WORKSPACEs (depth limit: 3).
- **Email module** using Resend for verification, magic link, and invitation
  emails.
- **Decorators:** `@Public()`, `@CurrentUser()`, `@RequirePermission()`.

### Changed

- All controllers must now declare `@ApiCookieAuth()` for Swagger to mark
  them as protected.

### Security

- Per-IP rate limit of 5 requests / 15 minutes on auth endpoints (configurable
  in `auth.module.ts`).
- Session cookies set HttpOnly, SameSite=Lax, Secure in production.

---

## [0.2.0] - 2026-04-15

> **Phase 2 milestone — NestJS API + Prisma scaffold complete.**

### Added

- **NestJS 11** application using the **Fastify adapter** under `apps/api/`.
- **Prisma 5** schema in `packages/db/`:
  - Better Auth core models (`User`, `Session`, `Account`, `Verification`).
  - Organisation models (`Organization`, `Member`, `Invitation`) extended for
    hierarchy support.
- **`BaseRepository<T>`** — generic, tenant-scoped Prisma helper with
  built-in soft delete, audit field handling, and cursor pagination.
- **`HttpExceptionFilter`** — uniform error envelope.
- **`TransformInterceptor`** — uniform success envelope (excluded for the
  health endpoint).
- **Pino structured logging** via `nestjs-pino` with PII redaction
  allow-list and request-id correlation.
- **Swagger UI** at `/api/docs` with cookie-auth scheme pre-configured.
- **BullMQ** wiring for background jobs (Redis-backed, retry + DLQ).
- **`HealthModule`** with liveness check at `/api/v1/health`.

---

## [0.1.0] - 2026-04-01

> **Phase 1 milestone — repository skeleton.**

### Added

- pnpm 9 monorepo with `apps/*` and `packages/*` workspaces.
- Strict TypeScript baseline (`tsconfig.base.json`, `target: ES2022`,
  `module: NodeNext`, decorators enabled).
- Docker Compose dev stack (`postgres:16`, `redis:7`).
- Prettier + commitlint + Husky + lint-staged.
- `.env.example` with the full set of expected variables.
- Initial documentation: `README.md`, `CLAUDE.md`, `.claude/rules/*`.

---

[Unreleased]: https://github.com/your-org/wa-kijo/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/your-org/wa-kijo/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/your-org/wa-kijo/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/your-org/wa-kijo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/wa-kijo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/wa-kijo/releases/tag/v0.1.0
