# wa'kijo — Product Requirements Document

> **Owner:** wa-kijo core team
> **Status:** Living document — updated each phase
> **Last revised:** 2026-05-02

This PRD describes what wa'kijo is, who it is for, what is in scope (and
what is deliberately not), and the catalogue of functional requirements
referenced as `FR-XXX` throughout the codebase and ADRs.

For the rationale behind specific architectural choices, see
[`architecture.md`](architecture.md) and the ADRs in
[`decisions/`](decisions/).

---

## 1. Vision

> A production-grade, opinionated SaaS boilerplate that lets a small NestJS
> team ship a multi-tenant B2B product on day one — without spending six
> weeks on auth, RBAC, billing, and tenant scoping plumbing.

wa'kijo is the foundation of the wa' product portfolio. Two products are
already forked from it:

- **wa-kiro** — WhatsApp Business SaaS for small businesses.
- **wa-lawe** — chess tournament manager.

Both share the same plumbing. wa'kijo extracts that plumbing into a
standalone, sellable boilerplate.

---

## 2. Target customer

| Segment | Description | Why they buy |
|---|---|---|
| **Solo founders** | Single developer building a B2B SaaS MVP | Skip 4–6 weeks of boilerplate, ship feature work faster |
| **Small agencies** | 2–10 developers building client SaaS products | Reuse the same hardened foundation across multiple client projects |
| **Internal tools teams** | Engineering teams at mid-sized companies building internal multi-tenant apps | Inherit a production-quality auth / RBAC / observability stack instead of building it |
| **NestJS shops** | Teams that have already standardised on NestJS and don't want to switch | Get the surrounding ecosystem (Prisma, Better Auth, Next.js, Stripe) wired correctly |

**Not the target customer:** developers looking for an unopinionated starter
("just give me Express and a Postgres connection string"), Next.js
fullstack-only teams (we have a separable backend on purpose), or anyone
who needs MongoDB / Drizzle / Auth.js out of the box.

---

## 3. Goals and non-goals

### Goals

- **G1.** A buyer can clone the repo, run six commands, and have a working
  multi-tenant SaaS scaffold with auth, RBAC, billing, and email at
  `localhost`.
- **G2.** The opinions are documented well enough that a buyer can choose to
  swap a piece (e.g. Resend for SES) without reading the source code.
- **G3.** Every "non-obvious" decision is captured as an ADR a buyer can
  read in 5 minutes.
- **G4.** Cross-tenant isolation, webhook signature verification, and audit
  logging work correctly out of the box and are tested in CI.
- **G5.** Production deployment is documented for at least Railway, AWS, and
  self-hosted Docker.
- **G6.** Updates roll forward cleanly via documented upgrade steps for
  every minor and major version.

### Non-goals

- **N1.** A drag-and-drop UI builder, low-code editor, or visual schema
  designer.
- **N2.** A CMS or marketing-site CMS.
- **N3.** Compatibility with non-Postgres databases. We assume Postgres 16+.
- **N4.** Compatibility with Express, Hono, Drizzle, Mongoose, or Auth.js.
- **N5.** A free / OSS tier. wa'kijo is a commercial product.
- **N6.** Fully managed hosting for buyers — buyers own their deployments.

---

## 4. Phases

| Phase | Status | Scope |
|---|---|---|
| **Phase 1** | ✅ Complete | Repo skeleton, pnpm 9 monorepo, tsconfig, Docker Compose, lint/format/commit hooks |
| **Phase 2** | ✅ Complete | NestJS + Fastify scaffold, Prisma schema, BaseRepository, Pino logging, BullMQ wiring, Swagger UI |
| **Phase 3** | ✅ Complete | Better Auth integration, organisation hierarchy, RBAC guards, AsyncLocalStorage context |
| **Phase 4** | ✅ Complete | Next.js 15 frontend scaffold, shadcn/ui, TanStack Query, auth pages, app shell |
| **Phase 5** | 🚧 In progress | Domain feature modules (contacts, conversations, tags) — used by `wa-kiro` |
| **Phase 6** | Planned | Stripe + Billplz / ToyyibPay billing modules behind a common interface |
| **Phase 7** | Planned | Public API key authentication for buyers' integrations |
| **Phase 8** | Planned | Mintlify customer documentation site published at `docs.wakijo.dev` |
| **1.0** | Planned | First public release; commercial licence finalised |

---

## 5. Functional requirements

The full FR catalogue is grouped by domain. Each requirement has a stable
`FR-XXX` identifier. Code, tests, and ADRs reference these IDs.

### 5.1 Authentication (FR-100 series)

| ID | Requirement | Status |
|---|---|---|
| FR-101 | Sign-up with email and password | ✅ |
| FR-102 | Email verification required before first sign-in | ✅ |
| FR-103 | Sign-in with email and password | ✅ |
| FR-104 | Magic-link sign-in (15-minute single-use token) | ✅ |
| FR-105 | Password reset via emailed link | ✅ |
| FR-106 | Google OAuth (optional, gated by env vars) | ✅ |
| FR-107 | Sign-out from current device | ✅ |
| FR-108 | Sign-out from all devices | 🚧 Phase 5 |
| FR-109 | Active session list (`/settings/sessions`) | ✅ |
| FR-110 | Session expiry: 30 days, sliding | ✅ |
| FR-111 | Per-IP rate limit on sign-in: 5 / 15 min | ✅ |
| FR-112 | Cookie: HttpOnly, SameSite=Lax, Secure in production | ✅ |
| FR-113 | TOTP-based MFA enrolment and challenge | Planned 1.0 |
| FR-114 | Passkey (WebAuthn) sign-in | Planned 1.1 |

### 5.2 Multi-tenancy and RBAC (FR-200 series)

| ID | Requirement | Status |
|---|---|---|
| FR-201 | 3-level organisation hierarchy: SYSTEM → AGENCY → WORKSPACE | ✅ |
| FR-202 | A user can be a member of multiple organisations | ✅ |
| FR-203 | Active organisation tracked in the session | ✅ |
| FR-204 | Role inheritance up the hierarchy (depth ≤ 3) | ✅ |
| FR-205 | Roles: `owner`, `admin`, `member` | ✅ |
| FR-206 | Server-side enforcement via `@RequirePermission('resource:action')` | ✅ |
| FR-207 | Frontend `<Can do="..." />` and `useCan()` UX hint | ✅ |
| FR-208 | Single source-of-truth permission catalogue in `@wa-kijo/shared` | ✅ |
| FR-209 | Member invitation flow with email | ✅ |
| FR-210 | Member removal | ✅ |
| FR-211 | Cross-tenant access fuzz test in CI | 🚧 Phase 5 |
| FR-212 | Custom roles per organisation | Planned 1.1 |

### 5.3 Data layer (FR-300 series)

| ID | Requirement | Status |
|---|---|---|
| FR-301 | All persistence through `BaseRepository<T>` | ✅ |
| FR-302 | Soft delete by default on user-facing entities | ✅ |
| FR-303 | Cursor pagination for any list endpoint > 1k rows | ✅ |
| FR-304 | Audit fields (`createdBy`, `updatedBy`) on mutable models | ✅ |
| FR-305 | Tenant scoping injected by Prisma middleware | ✅ |
| FR-306 | Migration files generated only via `prisma migrate dev` | ✅ |
| FR-307 | DTO validation via Zod end-to-end | ✅ |
| FR-308 | Audit log table for sensitive mutations | 🚧 Phase 5 |
| FR-309 | Restore-from-soft-delete admin endpoint | Planned 1.1 |

### 5.4 Domain modules (FR-400 series)

| ID | Requirement | Status |
|---|---|---|
| FR-401 | Contacts module: CRUD, search, tagging, blocked flag | ✅ |
| FR-402 | Tags module: CRUD per organisation | ✅ |
| FR-403 | Conversations module: open / close / snooze, channel agnostic | ✅ |
| FR-404 | Messages module: inbound + outbound, queued dispatch | ✅ |
| FR-405 | Bulk contact import (CSV) | Planned Phase 5.1 |
| FR-406 | Webhook ingest endpoint with HMAC verification | Planned Phase 5.2 |

### 5.5 Billing (FR-500 series)

| ID | Requirement | Status |
|---|---|---|
| FR-501 | `BillingProvider` interface with Stripe implementation | 🚧 Phase 6 |
| FR-502 | Billplz implementation behind the same interface | 🚧 Phase 6 |
| FR-503 | ToyyibPay implementation behind the same interface | 🚧 Phase 6 |
| FR-504 | Webhook signature verification for every provider | 🚧 Phase 6 |
| FR-505 | Idempotent webhook handling using provider event IDs | 🚧 Phase 6 |
| FR-506 | Plan / quota model decoupled from provider | 🚧 Phase 6 |
| FR-507 | Usage-based metering for outbound messages | Planned 1.1 |

### 5.6 Background jobs (FR-600 series)

| ID | Requirement | Status |
|---|---|---|
| FR-601 | BullMQ + Redis 7 wired into NestJS | ✅ |
| FR-602 | Retry: 3 attempts, exponential backoff (1s, 5s, 30s) | ✅ |
| FR-603 | Dead-letter queue for terminally failed jobs | ✅ |
| FR-604 | Bull-Board admin panel at `/admin/queues`, RBAC-gated | 🚧 Phase 5 |
| FR-605 | Scheduled jobs (cron) for cleanup and reporting | Planned Phase 5.2 |

### 5.7 Email (FR-700 series)

| ID | Requirement | Status |
|---|---|---|
| FR-701 | Resend integration via `EmailModule` | ✅ |
| FR-702 | Email templates: verification, magic link, invitation | ✅ |
| FR-703 | React Email migration for templates | Planned Phase 5 |
| FR-704 | SES adapter behind a common `EmailProvider` interface | Planned 1.1 |

### 5.8 Observability (FR-800 series)

| ID | Requirement | Status |
|---|---|---|
| FR-801 | Pino structured logs with request-id correlation | ✅ |
| FR-802 | PII redaction allow-list | ✅ |
| FR-803 | Sentry error tracking, env-gated | ✅ |
| FR-804 | OpenTelemetry traces (Phase 6) | Planned |
| FR-805 | Prometheus metrics endpoint | Planned 1.1 |

### 5.9 Frontend (FR-900 series)

| ID | Requirement | Status |
|---|---|---|
| FR-901 | Next.js 15 App Router, server-component-first | ✅ |
| FR-902 | shadcn/ui primitives, Tailwind CSS | ✅ |
| FR-903 | Auth pages: sign-in, sign-up, magic link, reset | ✅ |
| FR-904 | Authenticated app shell: sidebar, top bar, org switcher | ✅ |
| FR-905 | TanStack Query with auth-aware fetcher | ✅ |
| FR-906 | Server-side session guard in `(app)/layout.tsx` | ✅ |
| FR-907 | i18n wiring (default English, ms-MY translation seed) | Planned Phase 5.2 |
| FR-908 | Dark mode toggle | ✅ |

### 5.10 DevEx and tooling (FR-1000 series)

| ID | Requirement | Status |
|---|---|---|
| FR-1001 | pnpm 9 monorepo with `apps/*` and `packages/*` | ✅ |
| FR-1002 | Strict TypeScript across all packages | ✅ |
| FR-1003 | Prettier + commitlint + Husky + lint-staged | ✅ |
| FR-1004 | Vitest unit suites + Testcontainers integration suites | ✅ |
| FR-1005 | Playwright E2E suite | ✅ |
| FR-1006 | Docker Compose dev stack (Postgres 16, Redis 7) | ✅ |
| FR-1007 | Swagger UI at `/api/docs` (dev only) | ✅ |
| FR-1008 | Static OpenAPI snapshot generated on release | 🚧 Phase 5 |
| FR-1009 | CI pipeline: typecheck, lint, unit, integration, e2e | Planned Phase 5 |

---

## 6. Non-functional requirements

| Area | Requirement | Notes |
|---|---|---|
| **Performance** | API p99 < 250 ms for typical CRUD on a 100k-row table | Cursor pagination, explicit `select`, PgBouncer in prod |
| **Scale** | 1M+ users, 10M+ contacts, 100M+ messages on a single tenant | BaseRepository indexes, partitioning playbook in Phase 7 |
| **Availability** | 99.9% monthly uptime for buyers using the recommended deployment | Self-hosted; we ship the recipe, buyers run it |
| **Security** | Tenant isolation tested in CI; webhook signatures verified; argon2id passwords | See [`SECURITY.md`](../SECURITY.md) and [`.claude/rules/security.md`](../.claude/rules/security.md) |
| **Privacy** | PDPA-compliant defaults, soft delete + 30-day cleanup job | `docs/observability.md` covers audit log retention |
| **Accessibility** | WCAG 2.2 AA on all customer-facing UI | Phase 5.2 audit |
| **i18n** | English first; ms-MY seed; everything user-visible behind a translation key | Phase 5.2 |

---

## 7. Out-of-scope (often requested but deliberate)

These come up in customer conversations. We've said no, on purpose.

- **Visual workflow builder.** Use Inngest, Trigger.dev, or n8n if you need
  one. wa'kijo is a code-first product.
- **CMS for marketing pages.** Use Sanity, Payload, or Strapi.
- **Drag-and-drop email designer.** Use the React Email components directly.
- **Microservices split out of the box.** We ship a modular monolith. You
  can split later if you outgrow it; most buyers won't.
- **gRPC API.** REST + Swagger covers 99% of B2B SaaS needs. Buyers can add
  gRPC if they need it.
- **GraphQL.** Same reasoning. The shared Zod DTOs already give you typed
  client SDK generation if you want that.

---

## 8. Glossary

See [`glossary.md`](glossary.md). Add new terms there as they appear.

---

## 9. Open questions

These are the questions we're actively discussing. They become ADRs once
decided.

- Should we ship a Helm chart for Kubernetes deployments at 1.0 or wait for
  customer demand? (Currently leaning: Docker Compose is enough for 1.0.)
- React Email vs Resend's built-in templating for invitation emails. (Currently
  leaning: React Email for any new template work.)
- Should `apps/web/` be split out into a buyer-overrideable package once the
  shell is stable? (Currently leaning: keep it as an app, document the
  customisation patterns.)

---

## 10. Document history

| Date | Author | Change |
|---|---|---|
| 2026-04-01 | core | Initial draft alongside Phase 1 |
| 2026-04-15 | core | Added FR-300 series, NFRs |
| 2026-04-25 | core | Added FR-200 (RBAC) and Phase 3 status |
| 2026-05-02 | core | Phase 4 status, FR-900 series, Mintlify scope |
