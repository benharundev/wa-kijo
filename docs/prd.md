# wa'kijo — Product Requirements Document

> **Owner:** wa-kijo core team **Status:** Living document — updated each phase
> **Last revised:** 2026-05-17

This PRD describes what wa'kijo is, who it is for, what is in scope (and what is
deliberately not), and the catalogue of functional requirements referenced as
`FR-XXX` throughout the codebase and ADRs.

For the rationale behind specific architectural choices, see
[`architecture.md`](architecture.md) and the ADRs in [`decisions/`](decisions/).

---

## 1. Vision

> A production-grade, opinionated SaaS boilerplate that lets a small NestJS team
> ship a multi-tenant B2B product on day one — without spending six weeks on
> auth, RBAC, billing, and tenant scoping plumbing.

wa'kijo is the foundation of the wa' product portfolio. Two products are already
forked from it:

- **wa-kiro** — WhatsApp Business SaaS for small businesses.
- **wa-lawe** — chess tournament manager.

Both share the same plumbing. wa'kijo extracts that plumbing into a standalone,
sellable boilerplate.

---

## 2. Target customer

| Segment                  | Description                                                                  | Why they buy                                                                          |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Solo founders**        | Single developer building a B2B SaaS MVP                                     | Skip 4–6 weeks of boilerplate, ship feature work faster                               |
| **Small agencies**       | 2–10 developers building client SaaS products                                | Reuse the same hardened foundation across multiple client projects                    |
| **Internal tools teams** | Engineering teams at mid-sized companies building internal multi-tenant apps | Inherit a production-quality auth / RBAC / observability stack instead of building it |
| **NestJS shops**         | Teams that have already standardised on NestJS and don't want to switch      | Get the surrounding ecosystem (Prisma, Better Auth, Next.js, Stripe) wired correctly  |

**Not the target customer:** developers looking for an unopinionated starter
("just give me Express and a Postgres connection string"), Next.js
fullstack-only teams (we have a separable backend on purpose), or anyone who
needs MongoDB / Drizzle / Auth.js out of the box.

---

## 3. Goals and non-goals

### Goals

- **G1.** A buyer can clone the repo, run six commands, and have a working
  multi-tenant SaaS scaffold with auth, RBAC, billing, and email at `localhost`.
- **G2.** The opinions are documented well enough that a buyer can choose to
  swap a piece (e.g. Resend for SES) without reading the source code.
- **G3.** Every "non-obvious" decision is captured as an ADR a buyer can read in
  5 minutes.
- **G4.** Cross-tenant isolation, webhook signature verification, and audit
  logging work correctly out of the box and are tested in CI.
- **G5.** Production deployment is documented for at least Railway, AWS, and
  self-hosted Docker.
- **G6.** Updates roll forward cleanly via documented upgrade steps for every
  minor and major version.

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

> **Positioning re-sort (2026-05-17, final):** two decisions drive the roadmap
> below.
>
> **(1) Enterprise day-one positioning.** SSO/SCIM/SAML, audit log streaming,
> custom domains, white-labeling all move into P0 (not P1). Outbound webhooks +
> public API + API keys are core, not paid add-ons.
>
> **(2) Reversal of the 2026-05-10 platform pivot.** wa'kijo is now the
> **enterprise SaaS foundation under wa'lawe**, not a platform with pluggable
> modules. **Module Registry, Customization Layer, and kernel governance are
> dropped from v1.0.** Pragmatic DDD becomes a recommended internal pattern, not
> enforced policy. All 11 shared engines build into wa'kijo _before_ wa'lawe
> development starts (engines-first, Path 2). Future business modules either
> fork wa'kijo or are built separately.
>
> v1.0 estimate: **~15–22 months** from 2026-05-17. ADRs 0008, 0009, 0010 are
> partially superseded — a follow-up ADR-0011 should formalize the reversal.

### 4.1 Phase status at a glance

| Phase        | Epoch                          | Scope                                                                                                                                                                                                                                                                                                                                                                              | Status         |
| ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Phase 1**  | Foundation                     | Repo skeleton, pnpm 9 monorepo, tsconfig, Docker Compose, lint/format/commit hooks                                                                                                                                                                                                                                                                                                 | ✅ Complete    |
| **Phase 2**  | Foundation                     | NestJS + Fastify scaffold, Prisma schema, BaseRepository, Pino logging, BullMQ wiring, Swagger UI                                                                                                                                                                                                                                                                                  | ✅ Complete    |
| **Phase 3**  | Foundation                     | Better Auth integration, organisation hierarchy, RBAC guards, AsyncLocalStorage context                                                                                                                                                                                                                                                                                            | ✅ Complete    |
| **Phase 4**  | Foundation                     | Next.js 15 frontend scaffold, shadcn/ui, TanStack Query, auth pages, app shell                                                                                                                                                                                                                                                                                                     | ✅ Complete    |
| **Phase 5**  | Foundation                     | Domain feature modules (contacts, conversations, messages, tags, audit log) — used by `wa-kiro`                                                                                                                                                                                                                                                                                    | ✅ Complete    |
| **Phase 6**  | **A · Platform Hardening**     | **Audit engine** (immutability, retention, SIEM streaming) · **Storage engine** (uploads, S3/R2, virus scan, signed URLs) · MFA/2FA (TOTP + WebAuthn, org-policy enforcement) · SSO (SAML 2.0 + OIDC) · SCIM 2.0 provisioning · session mgmt UI · support impersonation · per-org IP allowlist · org suspension + lifecycle · maintenance mode                                     | 🚧 In progress |
| **Phase 7**  | **B · Compliance & DX**        | OpenTelemetry tracing · Prometheus/OTLP metrics · Sentry · GDPR/PDPA tenant data export · right-to-delete pipeline · field-level encryption · retention policies · OpenAPI auto-gen from Zod · API keys/PATs with scopes · public API surface · outbound webhooks (HMAC-signed, retried, DLQ) · per-API-key rate limiting                                                          | Planned        |
| **Phase 8**  | **C · Commerce & White-Label** | **Notification engine** (in-app, preferences, SSE-driven) · **Communication engine** (outbound SMS/email/WhatsApp) · usage metering · quota enforcement middleware · invoices/receipts UI · tax/VAT (Stripe Tax) · manual invoicing for enterprise (PO, NET-30) · custom domains (CNAME + automated TLS) · white-labeling (logo, colors, email-from per tenant) · full i18n wiring | Planned        |
| **Phase 9**  | **D · Engines Build-out**      | **Booking Core** (with Availability folded in) · **Workflow** engine · **Document** engine · **Report** engine · **Inventory Core** · **Invoice Core**. Engines-only phase — no business module code yet. wa'lawe development is _blocked_ until this phase completes.                                                                                                             | Planned        |
| **Phase 10** | **E · wa'lawe + v1.0 GA**      | **wa'lawe (chess tournaments)** built on the completed engine foundation · super-admin console full · tenant lifecycle ops (suspend, restore, transfer, hard-delete) · sandbox/test mode with isolated API keys · TypeScript SDK from OpenAPI · Bull-Board with RBAC · Mintlify customer docs at `docs.wakijo.dev` · v1.0 Enterprise GA tag                                        | Planned        |
| **Post-1.0** | Backlog                        | **Second business module (TBD — see §5.16)** · search (Postgres FTS → Meilisearch) · push notifications · Python SDK · trusted device mgmt · brand kit per tenant · coupons/promo codes · dunning automation · data residency · additional business modules (CRM/Inventory/Invoice/Reports)                                                                                        | Backlog        |

### 4.2 Critical-path dependencies

These items block multiple downstream phases. Build them first within their
epoch.

1. **Audit engine hardening (Phase 6)** blocks SSO, SCIM, and impersonation (all
   three write enterprise-grade audit events). Lock immutability + retention +
   SIEM streaming early.
2. **Storage engine (Phase 6)** blocks every downstream module that handles
   files — avatars, attachments, exports, generated documents.
3. **OpenAPI auto-gen (Phase 7)** blocks the public API surface, webhook event
   catalog, and SDK generation. Single source of truth or nothing.
4. **All Phase 9 engines complete** blocks the start of wa'lawe development in
   Phase 10. This is the explicit Path 2 sequencing — engines-first,
   module-after.
5. **Booking Core stabilization** blocks wa'lawe specifically. Even though it's
   no longer a workspace package with formal public API freeze, its in-API
   surface (services, types, DTOs) needs to be settled before wa'lawe consumes
   it heavily.

### 4.3 Phase 6–10 deeper detail

#### Phase 6 — Platform Hardening (Epoch A)

**Goal:** every enterprise security questionnaire passes. Foundation engines
(Audit + Storage) shipped.

Key engines + modules: **Audit engine** hardening (immutability, retention, SIEM
streaming — extends FR-308) · **Storage engine** (uploads, S3/R2, virus scan,
thumbnails, signed URLs) · MFA/2FA (FR-1701–1703) · SSO SAML+OIDC (FR-1704/1705)
· SCIM 2.0 (FR-1706) · session management (FR-1707) · impersonation (FR-1708) ·
IP allowlist (FR-1709) · org lifecycle (FR-1710/1711) · maintenance mode.

**Note on Module Registry:** dropped from v1.0 scope per the 2026-05-17
reversal. FR-1100 series is marked deferred. wa'lawe will be wired into wa'kijo
as a normal NestJS feature module without registry-based enable/disable per
tenant.

**Exit criteria:** a SOC 2 Type I auditor can complete a controls review without
findings on Identity, Audit, or Tenant Isolation. Audit + Storage engines
production-ready.

#### Phase 7 — Compliance & DX (Epoch B)

**Goal:** pass enterprise procurement; let customers integrate without a CSM.

Key modules: OpenTelemetry (FR-804 retargeted), metrics export (FR-805
retargeted), Sentry (FR-803 ✅), GDPR/PDPA export (FR-1801), right-to-delete
(FR-1802), field-level encryption (FR-1803), retention (FR-1804), OpenAPI
auto-gen (FR-1901), API keys + scopes (FR-1902/1903), public API (FR-1904),
outbound webhooks (FR-1906/1907), per-key rate limiting (FR-1905).

**Exit criteria:** a customer can integrate end-to-end via the public API +
webhooks with no human support.

#### Phase 8 — Commerce & White-Label (Epoch C)

**Goal:** invoice an enterprise customer correctly and look like their product.
Notification + Communication engines shipped.

Key engines + modules: **Notification engine** (in-app bell, SSE, preferences) ·
**Communication engine** (outbound SMS/email/WhatsApp — replaces the
`MessageDispatchProcessor` stub) · usage metering (FR-2001) · quota enforcement
(FR-2002) · invoices UI (FR-2003) · tax/VAT (FR-2004) · manual invoicing
(FR-2005) · custom domains (FR-2201) · white-labeling (FR-2202) · full i18n
(FR-2203, supersedes FR-907).

**Exit criteria:** Acme Corp's first invoice arrives on `app.acme.com`
letterhead with Acme branding and correct tax. Notification + Communication
engines production-ready.

#### Phase 9 — Booking Core + Customization + First Module (Epoch D)

**Goal:** prove the platform thesis with one real business module.

Key modules: Booking Core (FR-1200 series) public API frozen, Pragmatic DDD
(FR-1300 series), Customization Layer L1–L3 (FR-1400 series), wa'lawe (FR-1500
series), super-admin console v1 (FR-2301).

**Exit criteria:** wa'lawe lives on top of the platform with zero forks of core.
All customizations route through Config → Custom Fields → Hooks → Policies → UI
Slots.

#### Phase 10 — v1.0 GA Polish (Epoch E)

**Goal:** ship v1.0 Enterprise GA. wa'kijo platform + wa'lawe as the only
business module.

Key modules: super-admin console full (FR-2301), tenant lifecycle ops
(FR-2302/2303), sandbox/test mode (FR-2401), TypeScript SDK (FR-2402),
Bull-Board with RBAC (extension of FR-604), Mintlify customer docs site.

**Exit criteria:** v1.0 tag cut. wa'kijo platform + wa'lawe in production with
at least one reference enterprise customer. Platform thesis (Module Registry,
Customization Layer, kernel governance) shipped and documented even though only
wa'lawe consumes it in v1.0 — second module proof point deferred post-v1.0.

### 4.4 Open scoping decisions

- **Build vs buy for SSO/SCIM.** WorkOS ($125/connection/month) ships SSO +
  SCIM + Directory Sync + Audit Logs as one integration and saves ~6–8 weeks.
  Pending ADR.
- **Document engine in v1.0?** Only required if wa'lawe v1.0 ships PDF output
  (certificates, brackets, score sheets). If yes, build minimal PDF generation
  inline in wa'lawe (no separate engine package). If no, drop. Pending wa'lawe
  feature-scope decision.
- **Data residency** — post-v1.0 unless a paying enterprise prospect makes it a
  contractual requirement before then.
- **Second business module** — deferred post-v1.0. See §5.16 for the candidate
  shortlist (wa-klinik, wa-kelas, wa-meja, wa-rumah).

### 4.5 Shared Engines (Layer 3) — locked v1.0 scope

The platform layer beneath wa'lawe. Originally scoped at 11 engines (sized for
"platform with N future modules"). Re-scoped 2026-05-17 to **6 items** for the
wa'kijo + wa'lawe v1.0 cut.

| #   | Engine            | Form                                                 | Phase | Notes                                                                                                                                                                      |
| --- | ----------------- | ---------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Booking Core**  | Workspace package `@wa-kijo/booking-core`            | 9     | The only true _kernel_. Availability rules folded in (no separate `availability-core` package). Public API freezes at v1.0.0 in Phase 9 — see ADR-0010 and FR-1200 series. |
| 2   | **Audit**         | In-API NestJS module (`apps/api/src/modules/audit/`) | 6     | Append-only event log with immutability, retention policies, SIEM streaming. Enterprise day-one requirement. Extends FR-308.                                               |
| 3   | **Notification**  | In-API NestJS module                                 | 8     | In-app notifications (bell icon, SSE-driven), per-user preferences. Distinct from Communication.                                                                           |
| 4   | **Storage**       | In-API NestJS module                                 | 6     | File uploads, S3/R2 abstraction, virus scan, thumbnails, signed URLs. Required by every module that handles attachments.                                                   |
| 5   | **Communication** | In-API NestJS module                                 | 8     | Outbound SMS/email/WhatsApp/voice. Replaces the `MessageDispatchProcessor` stub. Pairs with Notification.                                                                  |
| 6   | **Document**      | In-API NestJS module (conditional)                   | 9     | PDF generation, templates, e-signature integration. **Only built if wa'lawe v1.0 needs PDFs** — otherwise dropped.                                                         |

**Engines deferred post-v1.0** (extract from in-API modules to workspace
packages only when a second module proves the need): Workflow, Report, Inventory
Core, Invoice Core. Listed in earlier drafts; not in v1.0 scope.

**Naming and packaging principle:** an engine becomes a workspace package
(`@wa-kijo/<name>-core`) only when (a) at least two modules consume it and (b)
it has a stable public API worth versioning independently. Until then, an in-API
NestJS module is sufficient — same code, less ceremony, no premature SemVer
cost.

---

## 5. Functional requirements

The full FR catalogue is grouped by domain. Each requirement has a stable
`FR-XXX` identifier. Code, tests, and ADRs reference these IDs.

### 5.1 Authentication (FR-100 series)

| ID     | Requirement                                          | Status      |
| ------ | ---------------------------------------------------- | ----------- |
| FR-101 | Sign-up with email and password                      | ✅          |
| FR-102 | Email verification required before first sign-in     | ✅          |
| FR-103 | Sign-in with email and password                      | ✅          |
| FR-104 | Magic-link sign-in (15-minute single-use token)      | ✅          |
| FR-105 | Password reset via emailed link                      | ✅          |
| FR-106 | Google OAuth (optional, gated by env vars)           | ✅          |
| FR-107 | Sign-out from current device                         | ✅          |
| FR-108 | Sign-out from all devices                            | 🚧 Phase 5  |
| FR-109 | Active session list (`/settings/sessions`)           | ✅          |
| FR-110 | Session expiry: 30 days, sliding                     | ✅          |
| FR-111 | Per-IP rate limit on sign-in: 5 / 15 min             | ✅          |
| FR-112 | Cookie: HttpOnly, SameSite=Lax, Secure in production | ✅          |
| FR-113 | TOTP-based MFA enrolment and challenge               | Planned 1.0 |
| FR-114 | Passkey (WebAuthn) sign-in                           | Planned 1.1 |

### 5.2 Multi-tenancy and RBAC (FR-200 series)

| ID     | Requirement                                                         | Status      |
| ------ | ------------------------------------------------------------------- | ----------- |
| FR-201 | 3-level organisation hierarchy: SYSTEM → AGENCY → WORKSPACE         | ✅          |
| FR-202 | A user can be a member of multiple organisations                    | ✅          |
| FR-203 | Active organisation tracked in the session                          | ✅          |
| FR-204 | Role inheritance up the hierarchy (depth ≤ 3)                       | ✅          |
| FR-205 | Roles: `owner`, `admin`, `member`                                   | ✅          |
| FR-206 | Server-side enforcement via `@RequirePermission('resource:action')` | ✅          |
| FR-207 | Frontend `<Can do="..." />` and `useCan()` UX hint                  | ✅          |
| FR-208 | Single source-of-truth permission catalogue in `@wa-kijo/shared`    | ✅          |
| FR-209 | Member invitation flow with email                                   | ✅          |
| FR-210 | Member removal                                                      | ✅          |
| FR-211 | Cross-tenant access fuzz test in CI                                 | ✅          |
| FR-212 | Custom roles per organisation                                       | Planned 1.1 |

### 5.3 Data layer (FR-300 series)

| ID     | Requirement                                               | Status      |
| ------ | --------------------------------------------------------- | ----------- |
| FR-301 | All persistence through `BaseRepository<T>`               | ✅          |
| FR-302 | Soft delete by default on user-facing entities            | ✅          |
| FR-303 | Cursor pagination for any list endpoint > 1k rows         | ✅          |
| FR-304 | Audit fields (`createdBy`, `updatedBy`) on mutable models | ✅          |
| FR-305 | Tenant scoping injected by Prisma middleware              | ✅          |
| FR-306 | Migration files generated only via `prisma migrate dev`   | ✅          |
| FR-307 | DTO validation via Zod end-to-end                         | ✅          |
| FR-308 | Audit log table for sensitive mutations                   | ✅          |
| FR-309 | Restore-from-soft-delete admin endpoint                   | Planned 1.1 |

### 5.4 Domain modules (FR-400 series)

| ID     | Requirement                                                   | Status     |
| ------ | ------------------------------------------------------------- | ---------- |
| FR-401 | Contacts module: CRUD, search, tagging, blocked flag          | ✅         |
| FR-402 | Tags module: CRUD per organisation                            | ✅         |
| FR-403 | Conversations module: open / close / snooze, channel agnostic | ✅         |
| FR-404 | Messages module: inbound + outbound, queued dispatch          | ✅         |
| FR-405 | Bulk contact import (CSV)                                     | ✅         |
| FR-406 | Webhook ingest endpoint with HMAC verification                | 🚧 Phase 6 |

### 5.5 Billing (FR-500 series)

| ID     | Requirement                                            | Status                   |
| ------ | ------------------------------------------------------ | ------------------------ |
| FR-501 | `BillingProvider` interface with Stripe implementation | 🚧 In progress (Phase 6) |
| FR-502 | Billplz implementation behind the same interface       | 🚧 In progress (Phase 6) |
| FR-503 | ToyyibPay implementation behind the same interface     | 🚧 In progress (Phase 6) |
| FR-504 | Webhook signature verification for every provider      | 🚧 In progress (Phase 6) |
| FR-505 | Idempotent webhook handling using provider event IDs   | 🚧 In progress (Phase 6) |
| FR-506 | Plan / quota model decoupled from provider             | 🚧 In progress (Phase 6) |
| FR-507 | Usage-based metering for outbound messages             | Planned 1.1              |

### 5.6 Background jobs (FR-600 series)

| ID     | Requirement                                           | Status |
| ------ | ----------------------------------------------------- | ------ |
| FR-601 | BullMQ + Redis 7 wired into NestJS                    | ✅     |
| FR-602 | Retry: 3 attempts, exponential backoff (1s, 5s, 30s)  | ✅     |
| FR-603 | Dead-letter queue for terminally failed jobs          | ✅     |
| FR-604 | Bull-Board admin panel at `/admin/queues`, RBAC-gated | ✅     |
| FR-605 | Scheduled jobs (cron) for cleanup and reporting       | ✅     |

### 5.7 Email (FR-700 series)

| ID     | Requirement                                           | Status          |
| ------ | ----------------------------------------------------- | --------------- |
| FR-701 | Resend integration via `EmailModule`                  | ✅              |
| FR-702 | Email templates: verification, magic link, invitation | ✅              |
| FR-703 | React Email migration for templates                   | Planned Phase 5 |
| FR-704 | SES adapter behind a common `EmailProvider` interface | Planned 1.1     |

### 5.8 Observability (FR-800 series)

| ID     | Requirement                                      | Status      |
| ------ | ------------------------------------------------ | ----------- |
| FR-801 | Pino structured logs with request-id correlation | ✅          |
| FR-802 | PII redaction allow-list                         | ✅          |
| FR-803 | Sentry error tracking, env-gated                 | ✅          |
| FR-804 | OpenTelemetry traces (Phase 6)                   | Planned     |
| FR-805 | Prometheus metrics endpoint                      | Planned 1.1 |

### 5.9 Frontend (FR-900 series)

| ID     | Requirement                                             | Status            |
| ------ | ------------------------------------------------------- | ----------------- |
| FR-901 | Next.js 15 App Router, server-component-first           | ✅                |
| FR-902 | shadcn/ui primitives, Tailwind CSS                      | ✅                |
| FR-903 | Auth pages: sign-in, sign-up, magic link, reset         | ✅                |
| FR-904 | Authenticated app shell: sidebar, top bar, org switcher | ✅                |
| FR-905 | TanStack Query with auth-aware fetcher                  | ✅                |
| FR-906 | Server-side session guard in `(app)/layout.tsx`         | ✅                |
| FR-907 | i18n wiring (default English, ms-MY translation seed)   | Planned Phase 5.2 |
| FR-908 | Dark mode toggle                                        | ✅                |

### 5.10 DevEx and tooling (FR-1000 series)

| ID      | Requirement                                            | Status |
| ------- | ------------------------------------------------------ | ------ |
| FR-1001 | pnpm 9 monorepo with `apps/*` and `packages/*`         | ✅     |
| FR-1002 | Strict TypeScript across all packages                  | ✅     |
| FR-1003 | Prettier + commitlint + Husky + lint-staged            | ✅     |
| FR-1004 | Vitest unit suites + Testcontainers integration suites | ✅     |
| FR-1005 | Playwright E2E suite                                   | ✅     |
| FR-1006 | Docker Compose dev stack (Postgres 16, Redis 7)        | ✅     |
| FR-1007 | Swagger UI at `/api/docs` (dev only)                   | ✅     |
| FR-1008 | Static OpenAPI snapshot generated on release           | ✅     |
| FR-1009 | CI pipeline: typecheck, lint, unit, integration, e2e   | ✅     |

### 5.11 Platform — Module Registry (FR-1100 series) — **Deferred post-v1.0**

> **Rescoped 2026-05-17 (ADR-0011):** wa'kijo no longer ships as a multi-module
> platform in v1.0. wa'lawe wires into wa'kijo via standard NestJS module
> imports. The Module Registry runtime is preserved here as design reference for
> the post-v1.0 case where a second business module is committed and
> pluggability becomes worth its overhead.

| ID      | Requirement                                                                                   | Status             |
| ------- | --------------------------------------------------------------------------------------------- | ------------------ |
| FR-1101 | `Module` Prisma model registering each installed module                                       | Deferred post-v1.0 |
| FR-1102 | `TenantModule` join table with per-tenant enable/disable + per-tenant config JSON             | Deferred post-v1.0 |
| FR-1103 | Boot-time manifest scanner reads `apps/api/src/modules/*/module.manifest.ts`                  | Deferred post-v1.0 |
| FR-1104 | Manifest schema validation via Zod; malformed manifest is a non-recoverable startup error     | Deferred post-v1.0 |
| FR-1105 | Dependency resolver — semver-aware; refuses to start on incompatible pairs or cycles          | Deferred post-v1.0 |
| FR-1106 | `@RequireModule('slug')` guard returns **404** (not 403) for non-enabled modules              | Deferred post-v1.0 |
| FR-1107 | `module.enabled` / `module.disabled` audit log entries on every TenantModule mutation         | Deferred post-v1.0 |
| FR-1108 | Module retirement preserves historical references (no FK breaks in AuditLog)                  | Deferred post-v1.0 |
| FR-1109 | Module manifests can declare new permissions; registry merges them into the runtime catalogue | Deferred post-v1.0 |
| FR-1110 | Existing `contacts` and `conversations` register via manifest before tag                      | Deferred post-v1.0 |
| FR-1111 | `pnpm module:create <slug>` CLI scaffolds from `_template/`                                   | Deferred post-v1.0 |
| FR-1112 | `pnpm module:upgrade <slug>` runs declared upgrade scripts                                    | Deferred post-v1.0 |

### 5.12 Platform — Booking Core (FR-1200 series)

> **Rescoped 2026-05-17 (ADR-0011):** Booking Core is no longer a versioned
> workspace package. It lives at `apps/api/src/modules/booking/` as a normal
> NestJS module that wa'lawe imports directly. FR-1201 and FR-1212
> (workspace-package + independent SemVer) are dropped. The remaining FRs are
> the kernel content — they ship in Phase 9 as part of the engines build-out
> before wa'lawe starts in Phase 10.

| ID      | Requirement                                                                                                                                              | Status     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-1201 | ~~`@wa-kijo/booking-core` workspace package with conditional exports~~ — **Dropped per ADR-0011.** Booking Core lives at `apps/api/src/modules/booking/` | Dropped    |
| FR-1202 | `TimeRange` value object with closed-open semantics                                                                                                      | 🚧 Phase 9 |
| FR-1203 | `BookingState` enum + `canTransition()` table                                                                                                            | 🚧 Phase 9 |
| FR-1204 | `Resource` and `Schedulable` interfaces                                                                                                                  | 🚧 Phase 9 |
| FR-1205 | `AvailabilityRule` types: `WorkingHoursRule`, `BlackoutRule`                                                                                             | 🚧 Phase 9 |
| FR-1206 | `ConflictDetectionService.assertNoOverlap()`                                                                                                             | 🚧 Phase 9 |
| FR-1207 | `AvailabilityCheckService.assertAvailable()`                                                                                                             | 🚧 Phase 9 |
| FR-1208 | 5 universal lifecycle events: Scheduled / Confirmed / Cancelled / Rescheduled / Completed                                                                | 🚧 Phase 9 |
| FR-1209 | `SchedulableRepositoryPort` + `DomainEventPublisherPort` interfaces                                                                                      | 🚧 Phase 9 |
| FR-1210 | Kernel layer keeps infrastructure imports out of `domain/` (NestJS, Prisma, BullMQ) — recommended pattern, not enforced                                  | 🚧 Phase 9 |
| FR-1211 | 90% line / 85% branch coverage enforced on `domain/`                                                                                                     | 🚧 Phase 9 |
| FR-1212 | ~~Independent SemVer; module manifests declare kernel range in `dependencies`~~ — **Dropped per ADR-0011**                                               | Dropped    |

### 5.13 Platform — Pragmatic DDD layout (FR-1300 series) — **Softened to recommended pattern**

> **Rescoped 2026-05-17 (ADR-0011):** The per-module DDD folder layout remains a
> recommended pattern for clarity inside complex modules. The ESLint enforcement
> (FR-1303) is removed. `_template/` stays in the repo as a reference but is no
> longer load-bearing kernel governance.

| ID      | Requirement                                                                         | Status                                    |
| ------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| FR-1301 | Per-module `domain / application / infrastructure / presentation` folders           | Recommended pattern (not enforced)        |
| FR-1302 | `_template/` module scaffold demonstrates the layout, including failing test stubs  | Optional reference                        |
| FR-1303 | ESLint `no-restricted-paths` enforces inward-only dependency rule                   | **Dropped per ADR-0011**                  |
| FR-1304 | Domain-events-as-objects-with-Zod-schemas pattern                                   | Recommended pattern                       |
| FR-1305 | Existing `contacts` and `conversations` modules refactored to the layout before tag | Deferred — refactor only if value emerges |
| FR-1306 | CQRS-with-separate-databases explicitly NOT adopted                                 | n/a (decision)                            |
| FR-1307 | Event sourcing explicitly NOT adopted                                               | n/a (decision)                            |

### 5.14 Platform — Customization Layer (FR-1400 series) — **Deferred post-v1.0**

> **Rescoped 2026-05-17 (ADR-0011):** With wa'lawe as the only business module
> in v1.0, the Customization Layer has no consumer — wa'lawe ships with a fixed
> feature set per tenant. Reintroduce post-v1.0 only if/when a second business
> module emerges or a tenant needs schema/UI extensibility.

| ID      | Requirement                                                                                                           | Status             |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ |
| FR-1401 | Per-tenant config overrides validated against module's declared Zod schema                                            | Deferred post-v1.0 |
| FR-1402 | `CustomFieldDefinition` table + JSONB storage on extending entities                                                   | Deferred post-v1.0 |
| FR-1403 | Custom field UI auto-rendered from definitions                                                                        | Deferred post-v1.0 |
| FR-1404 | `@Hook('hook.point')` decorator + typed payload contract                                                              | Deferred post-v1.0 |
| FR-1405 | Hook signatures versioned via SemVer; major bumps document migration path                                             | Deferred post-v1.0 |
| FR-1406 | Hook contract test harness (assert payload Zod parse on every hook point)                                             | Deferred post-v1.0 |
| FR-1407 | Policy classes for resource-level authorization (`canEdit(ctx, resource)`)                                            | Deferred post-v1.0 |
| FR-1408 | UI Slots system in Next.js — declared via manifest, filled by other modules                                           | Deferred post-v1.0 |
| FR-1409 | Customisation hierarchy enforced in docs: config → custom fields → hooks → policies → UI slots → custom module → fork | Deferred post-v1.0 |

### 5.15 Platform — wa'lawe as the first module (FR-1500 series)

| ID      | Requirement                                                                                                                                                                                                | Status      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-1501 | wa'lawe ships in a **separate repository** (`wa-lawe`, MIT-licensed), depending on wa'kijo Pro (Tier B+) at runtime. Per ADR-0011, it consumes `apps/api/src/modules/booking/` not `@wa-kijo/booking-core` | 🚧 Phase 10 |
| FR-1502 | Tournament + Round + Pairing + Player + Result aggregates                                                                                                                                                  | 🚧 Phase 10 |
| FR-1503 | Swiss pairing algorithm (domain service, pure logic, exhaustive tests)                                                                                                                                     | 🚧 Phase 10 |
| FR-1504 | Round-robin pairing algorithm                                                                                                                                                                              | 🚧 Phase 10 |
| FR-1505 | Knockout pairing algorithm with bracket seeding                                                                                                                                                            | 🚧 Phase 10 |
| FR-1506 | Tie-break methods (Buchholz, Sonneborn-Berger, direct encounter)                                                                                                                                           | 🚧 Phase 10 |
| FR-1507 | Standings calculation with multi-criteria sort                                                                                                                                                             | 🚧 Phase 10 |
| FR-1508 | Player registration & withdrawal (player as Resource)                                                                                                                                                      | 🚧 Phase 10 |
| FR-1509 | Tournament lifecycle: draft → registration → in-progress → completed → archived (5-state inline machine — Workflow engine NOT required for v1.0)                                                           | 🚧 Phase 10 |
| FR-1510 | wa'lawe Next.js pages: tournament dashboard, round view, standings, brackets                                                                                                                               | 🚧 Phase 10 |

### 5.16 Platform — Second business module (FR-1600 series) — **Deferred post-v1.0**

> **Rescoped 2026-05-17:** Workshop (wa-bengkel) was originally chosen as the
> second module to prove Booking Core generalizes, but it's structurally too
> similar to wa'lawe (both 1:1 slot bookings) to be a meaningful test. With v1.0
> scope narrowed to wa'kijo + wa'lawe only, the second module moves post-v1.0
> entirely.

**Candidate modules** (re-evaluated when post-v1.0 work begins):

| Candidate         | Commercial name | Stresses kernel against                                                            | Commercial profile                                              |
| ----------------- | --------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Clinic            | **wa-klinik**   | Hybrid queue + scheduled, multi-resource (doctor × room × nurse), compliance-heavy | Highest contract value, slowest build                           |
| Fitness/class     | **wa-kelas**    | Many-to-one bookings, waitlists, recurring schedules, capacity constraints         | Medium contract value, fast to ship                             |
| Restaurant        | **wa-meja**     | Capacity + party-size logic, overlapping slots, table-combining                    | Lower contract value, huge total market                         |
| Short-stay rental | **wa-rumah**    | Date-range vs slot bookings, seasonality, blackout dates                           | Most extreme test — proves Booking Core handles continuous time |

| ID      | Requirement                                                                                                       | Status             |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ |
| FR-1601 | Second business module selected from candidate shortlist                                                          | Deferred post-v1.0 |
| FR-1602 | Module consumes `@wa-kijo/booking-core` via stable public API (no kernel forks)                                   | Deferred post-v1.0 |
| FR-1603 | Module ships under Customization Layer pattern (no core forks for tenant variants)                                | Deferred post-v1.0 |
| FR-1604 | Dual-consumer test confirms Booking Core abstractions generalize                                                  | Deferred post-v1.0 |
| FR-1605 | Recurring availability rules graduate from module to kernel ONLY if this module + a third consumer prove the need | Deferred post-v1.0 |

---

## 6. Non-functional requirements

| Area              | Requirement                                                                    | Notes                                                                                               |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Performance**   | API p99 < 250 ms for typical CRUD on a 100k-row table                          | Cursor pagination, explicit `select`, PgBouncer in prod                                             |
| **Scale**         | 1M+ users, 10M+ contacts, 100M+ messages on a single tenant                    | BaseRepository indexes, partitioning playbook in Phase 7                                            |
| **Availability**  | 99.9% monthly uptime for buyers using the recommended deployment               | Self-hosted; we ship the recipe, buyers run it                                                      |
| **Security**      | Tenant isolation tested in CI; webhook signatures verified; argon2id passwords | See [`SECURITY.md`](../SECURITY.md) and [`.claude/rules/security.md`](../.claude/rules/security.md) |
| **Privacy**       | PDPA-compliant defaults, soft delete + 30-day cleanup job                      | `docs/observability.md` covers audit log retention                                                  |
| **Accessibility** | WCAG 2.2 AA on all customer-facing UI                                          | Phase 5.2 audit                                                                                     |
| **i18n**          | English first; ms-MY seed; everything user-visible behind a translation key    | Phase 5.2                                                                                           |

---

## 7. Out-of-scope (often requested but deliberate)

These come up in customer conversations. We've said no, on purpose.

- **Visual workflow builder.** Use Inngest, Trigger.dev, or n8n if you need one.
  wa'kijo is a code-first product.
- **CMS for marketing pages.** Use Sanity, Payload, or Strapi.
- **Drag-and-drop email designer.** Use the React Email components directly.
- **Microservices split out of the box.** We ship a modular monolith. You can
  split later if you outgrow it; most buyers won't.
- **gRPC API.** REST + Swagger covers 99% of B2B SaaS needs. Buyers can add gRPC
  if they need it.
- **GraphQL.** Same reasoning. The shared Zod DTOs already give you typed client
  SDK generation if you want that.

---

## 8. Commercial Tiers and Licensing

> **Decided 2026-05-17.** wa'kijo ships as a free open-source Community edition
> plus five commercial tiers (A–E). One-time license with a tier-dependent
> update window. wa'lawe is open-sourced separately as a reference
> implementation (its own repo, MIT-licensed) but requires a Pro tier or higher
> to run.

### 8.1 wa'kijo Community — Open Source

**License:** Apache 2.0 with a no-resale-of-the-boilerplate-itself clause
(typical pattern — see n8n, ToolJet). Buyers can build commercial apps freely on
top; they cannot repackage and sell wa'kijo itself.

**Goal:** developer mindshare and top-of-funnel for paid tiers. Lean enough to
drive upgrades, useful enough that people actually adopt it.

**Included:**

- Phase 1–5 foundation: pnpm monorepo, NestJS+Fastify, Prisma, BaseRepository,
  Next.js 15 shell, Pino logging, Docker Compose
- Better Auth basics: email/password, magic links, Google OAuth only
- Multi-tenant org hierarchy with 3-level RBAC and role inheritance
- One billing provider: **Stripe only** (Billplz, Curlec are paid-tier)
- Domain modules: contacts, conversations, messages, tags, basic audit log
- BullMQ + Redis basic wiring
- Email via Resend with basic transactional templates
- Cursor pagination + soft delete patterns
- Cross-tenant fuzz test (security credibility)
- Docs: getting-started, architecture overview, public ADRs
- Community patches for 90 days from each tagged release

**Excluded (paywall fence):**

- Multi-provider billing (Billplz, Curlec, Stripe Tax)
- MFA / WebAuthn
- The 11 shared engines beyond minimal stubs (Booking Core, Workflow, Audit Pro,
  Storage, Notification, Communication, Document, Report, Inventory Core,
  Invoice Core, Availability)
- White-labeling, custom domains, full i18n wiring
- Outbound webhooks, public API + keys, OpenAPI auto-gen
- OpenTelemetry, metrics export, Sentry
- SSO, SCIM, audit log hardening, field-level encryption, retention, GDPR
  tooling, impersonation, IP allowlist, session management
- Super-admin console, sandbox/test mode, TypeScript SDK
- Updates beyond 90 days

### 8.2 Commercial tiers (A–E)

Pricing is placeholder — calibrate against ShipFast ($299), Boilerplate.dev
($199–499), SaaS Pegasus ($249–999), Bullet Train ($249–999). Enterprise
boilerplate vendors charge $2k–5k+ for SSO/SCIM tiers.

| Tier  | Name                       | Price (placeholder)   | License scope                                           | Update window               | Buyer profile                                 |
| ----- | -------------------------- | --------------------- | ------------------------------------------------------- | --------------------------- | --------------------------------------------- |
| **A** | **wa'kijo Starter**        | $199 one-time         | 1 developer, 1 production project                       | 6 months                    | Solo founders, side projects                  |
| **B** | **wa'kijo Pro**            | $499 one-time         | 1 developer, unlimited projects                         | 12 months                   | Indie devs, multiple SaaS attempts            |
| **C** | **wa'kijo Team**           | $999 one-time         | Up to 5 developers, unlimited projects                  | 18 months                   | Small agencies, 2–5 dev teams                 |
| **D** | **wa'kijo Enterprise**     | $2,499 one-time       | Unlimited developers in one organisation                | 24 months                   | Companies building internal multi-tenant apps |
| **E** | **wa'kijo OEM / Reseller** | $9,999+ custom-quoted | White-label rights, source modification, reseller terms | Lifetime + priority support | Agencies reselling SaaS-in-a-box to clients   |

**Update model.** A buyer of Tier B in month 0 receives all wa'kijo releases up
to month 12 for free. From month 12 onwards, they continue to own everything
shipped up to that point, but new releases require a paid renewal (priced at
~50% of original tier price for an additional 12 months).

### 8.3 Feature matrix

What each tier unlocks beyond Community. Every paid tier includes everything
from the tier below it.

| Capability                                                    | OSS |  A  |  B  |  C  |  D  |  E  |
| ------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| **Foundation (Phases 1–5)**                                   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Auth basic (email/pw, OAuth, magic link)                      | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Stripe billing                                                | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Multi-provider billing (Billplz, Curlec)                      |  —  | ✅  | ✅  | ✅  | ✅  | ✅  |
| MFA (TOTP)                                                    |  —  | ✅  | ✅  | ✅  | ✅  | ✅  |
| MFA (WebAuthn / Passkeys)                                     |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Booking Core engine**                                       |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Workflow engine**                                           |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Document engine** (PDF generation)                          |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Report engine**                                             |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Notification engine** (in-app)                              |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Communication engine** (outbound SMS/email/WhatsApp)        |  —  |  —  | ✅  | ✅  | ✅  | ✅  |
| **Storage engine** (S3/R2, signed URLs)                       |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| **Inventory Core**                                            |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| **Invoice Core**                                              |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Custom domains                                                |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| White-labeling (logo, colors, email-from)                     |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Full i18n wiring (per-user locale)                            |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| OpenAPI auto-gen from Zod                                     |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Public API + API keys with scopes                             |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Outbound webhooks (HMAC, retried, DLQ)                        |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Usage metering + quota enforcement                            |  —  |  —  |  —  | ✅  | ✅  | ✅  |
| Manual invoicing (PO/NET-30)                                  |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Tax/VAT (Stripe Tax)                                          |  —  |  —  |  —  |  —  | ✅  | ✅  |
| **SSO** (SAML 2.0 + OIDC)                                     |  —  |  —  |  —  |  —  | ✅  | ✅  |
| **SCIM 2.0 provisioning**                                     |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Audit log hardening (immutability, SIEM streaming, retention) |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Field-level encryption                                        |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Retention policies per entity                                 |  —  |  —  |  —  |  —  | ✅  | ✅  |
| GDPR/PDPA export + right-to-delete                            |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Impersonation + IP allowlist                                  |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Session management UI                                         |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Org lifecycle ops (suspend, transfer)                         |  —  |  —  |  —  |  —  | ✅  | ✅  |
| OpenTelemetry + metrics + Sentry                              |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Super-admin console                                           |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Sandbox / test mode                                           |  —  |  —  |  —  |  —  | ✅  | ✅  |
| TypeScript SDK from OpenAPI                                   |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Mintlify customer docs templates                              |  —  |  —  |  —  |  —  | ✅  | ✅  |
| Priority email support                                        |  —  |  —  |  —  |  —  | ✅  | ✅  |
| **White-label rights** (remove wa'kijo branding)              |  —  |  —  |  —  |  —  |  —  | ✅  |
| **Reseller rights** (sell derivatives to clients)             |  —  |  —  |  —  |  —  |  —  | ✅  |
| **Source modification license**                               |  —  |  —  |  —  |  —  |  —  | ✅  |
| Quarterly office hours with core team                         |  —  |  —  |  —  |  —  |  —  | ✅  |

### 8.4 wa'lawe positioning

wa'lawe ships as a separate open-source repository (`wa-lawe`, MIT license) —
not bundled into any wa'kijo tier. It is the reference implementation that
proves wa'kijo can host a real production SaaS.

**Source is public** — anyone can read it to learn how to build a wa'kijo
module. This drives top-of-funnel mindshare for wa'kijo.

**Running it requires wa'kijo Pro (Tier B) or higher** — wa'lawe depends on
Booking Core, Workflow, Document, Notification, and Communication engines, all
of which live behind the Pro paywall. The "Vercel templates" model: source is
free, the platform underneath is paid.

The wa'lawe SaaS (`lawe.wakijo.dev` or similar) is run by the wa'kijo team as a
separate revenue line — chess federations and tournament organisers pay a SaaS
subscription. wa'lawe SaaS revenue is independent of wa'kijo boilerplate licence
sales.

### 8.5 License terms (summary)

Full text in `LICENSE-COMMUNITY.md`, `LICENSE-COMMERCIAL.md`, and
`LICENSE-OEM.md` (to be drafted).

| Term                                      | Community                 | A–D                        | E                             |
| ----------------------------------------- | ------------------------- | -------------------------- | ----------------------------- |
| Use in commercial products                | ✅                        | ✅                         | ✅                            |
| Modify source                             | ✅                        | ✅                         | ✅                            |
| Distribute modifications publicly         | ✅ (Apache 2.0)           | —                          | ✅ (reseller-licensed)        |
| Resell wa'kijo itself                     | ❌                        | ❌                         | ✅                            |
| Remove wa'kijo branding from buyer's apps | ✅ (apps you build)       | ✅ (apps you build)        | ✅ (apps + boilerplate)       |
| Receive future updates                    | 90 days post-release      | Per tier window            | Lifetime                      |
| Support channel                           | GitHub issues (community) | Email (tier-dependent SLA) | Priority email + office hours |

### 8.6 Open SKU decisions

- **Final pricing** — placeholders above. Need market research / pricing
  experiment.
- **WorkOS dependency disclosure** — if SSO/SCIM in Tier D uses WorkOS, the
  buyer pays WorkOS separately ($125/SSO connection/month). Must be disclosed
  pre-purchase.
- **Renewal pricing** — currently sketched at 50% of tier price for an
  additional 12 months. Industry varies between 30%–60%.
- **Stripe-only OSS billing edge case** — if a buyer ships an app on Community
  using Stripe, then needs Billplz for Malaysian customers, they must upgrade to
  A or higher. Confirm this is the intended fence (vs giving Billplz away to
  drive SEA adoption).

---

## 9. Glossary

See [`glossary.md`](glossary.md). Add new terms there as they appear.

---

## 10. Open questions

These are the questions we're actively discussing. They become ADRs once
decided.

- Should we ship a Helm chart for Kubernetes deployments at 1.0 or wait for
  customer demand? (Currently leaning: Docker Compose is enough for 1.0.)
- React Email vs Resend's built-in templating for invitation emails. (Currently
  leaning: React Email for any new template work.)
- Should `apps/web/` be split out into a buyer-overrideable package once the
  shell is stable? (Currently leaning: keep it as an app, document the
  customisation patterns.)
- **SSO/SCIM build vs buy.** WorkOS ($125/connection/month) ships SSO + SCIM +
  Directory Sync + Audit Logs and saves ~6–8 weeks. Pending ADR. If WorkOS, the
  cost must be disclosed in Tier D marketing (buyer pays WorkOS separately).
- **ADR-0011 follow-up.** Draft a new ADR that formalises the 2026-05-17
  reversal of the platform pivot — Module Registry dropped, Customization Layer
  dropped, Pragmatic DDD softened, Booking Core kept as an in-API module rather
  than a workspace package.
- **Hook ABI shape** (deferred). Was relevant under the platform thesis; under
  the (b) narrowing this is irrelevant unless platform-ness returns post-v1.0.
- **Custom field promotion path** (deferred). Same reasoning — only matters
  if/when Custom Fields are added post-v1.0.
- **Module marketplace** (deferred). Requires a multi-module platform thesis.
  Re-evaluate post-v1.0.
- **Final tier pricing** (§8.6). Placeholders need market calibration against
  ShipFast / Boilerplate.dev / SaaS Pegasus / Bullet Train.
- **Stripe-only OSS billing edge case** (§8.6). Confirm Billplz/Curlec stay
  paywalled in OSS, or relax to drive SEA adoption.

---

## 11. Document history

| Date       | Author | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-01 | core   | Initial draft alongside Phase 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-04-15 | core   | Added FR-300 series, NFRs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-25 | core   | Added FR-200 (RBAC) and Phase 3 status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-02 | core   | Phase 4 status, FR-900 series, Mintlify scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-05-02 | core   | Phase 5 marked complete (contacts, conversations, messages, tags, audit log, cross-tenant fuzz tests)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-05-10 | core   | **Platform pivot** — wa'kijo evolves from boilerplate-to-fork into platform-with-modules. New phases 6a–8 added; FR-1100/1200/1300/1400/1500/1600 series introduced. wa'lawe selected as the first business module. ADRs 0008–0010 ratified                                                                                                                                                                                                                                                                              |
| 2026-05-17 | core   | **Enterprise day-one re-sort.** SSO/SCIM/SAML moved to P0. Outbound webhooks + public API + API keys declared core, not paid add-ons. Phases 6–10 re-sequenced into five epochs (A–E) targeting v1.0 Enterprise GA                                                                                                                                                                                                                                                                                                       |
| 2026-05-17 | core   | **Platform-thesis reversal + Path 2 sequencing.** wa'kijo narrowed to wa'kijo + wa'lawe scope (option b). Module Registry, Customization Layer, kernel governance dropped. Pragmatic DDD softened to "recommended pattern". Booking Core kept as in-API module, not workspace package. All 11 shared engines build into wa'kijo across Phases 6/8/9 _before_ wa'lawe development starts in Phase 10. v1.0 estimate shifts to ~15–22 months. ADRs 0008/0009/0010 marked partially superseded — ADR-0011 follow-up pending |
| 2026-05-17 | core   | **Commercial SKU model added (§8).** Open Source `wa'kijo Community` (Apache 2.0) + five commercial tiers A–E (Starter / Pro / Team / Enterprise / OEM) with feature matrix, one-time pricing, tier-dependent update windows. wa'lawe ships as separate OSS repo (MIT) — running it requires Tier B+. Pricing placeholders pending market calibration                                                                                                                                                                    |
