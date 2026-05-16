# Glossary

> Plain-English definitions of every term used in wa'kijo's docs and code. When
> you introduce a new term, add it here. Alphabetical.

---

## A

**ADR (Architecture Decision Record)** — A short markdown file describing a
specific architectural choice, its alternatives, and the reasoning. Lives under
[`decisions/`](decisions/). Every non-obvious choice has one.

**AGENCY** — A middle-tier organisation in the multi-tenant hierarchy. Sits
between SYSTEM and WORKSPACE. Used by buyers whose customers manage multiple
sub-tenants (e.g. a marketing agency managing several brand accounts).

**AsyncLocalStorage** — Node.js built-in for propagating values along an async
call chain without prop-drilling. wa'kijo uses one `AsyncLocalStorage` instance
to carry the `RequestContext` (request ID, user ID, org ID, role) through every
controller, service, and repository call within a single HTTP request.

**audit log** — A persistent, append-only record of sensitive mutations (role
changes, billing updates, exports). See `AuditLog` in the schema.

---

## B

**BaseRepository** — Generic class in `apps/api/src/base/base.repository.ts`
that every feature repository extends. Provides tenant-scoped Prisma queries,
soft-delete handling, audit field population, and cursor pagination.

**Better Auth** — The TypeScript authentication library wa'kijo uses for
sign-in, sign-up, sessions, and the organisation plugin. Mounted as a Fastify
handler at `/api/auth/*`, outside the NestJS pipeline.

**Billplz** — A Malaysian payment gateway, included in wa'kijo as one of the
supported `BillingProvider` implementations alongside Stripe.

**BullMQ** — A Redis-backed job queue library. wa'kijo uses BullMQ for
background jobs: outbound message dispatch, webhook processing, scheduled
cleanup, and so on.

**Bull-Board** — A web admin UI for inspecting BullMQ queues. Mounted at
`/admin/queues` and gated by RBAC.

---

## C

**`Can`** — A React component (`<Can do="permission">`) and a companion hook
(`useCan`) for client-side permission UX. **Not a security boundary** —
server-side `@RequirePermission()` is the authority.

**CHANGELOG** — A human-readable list of changes per release, following the
[Keep a Changelog](https://keepachangelog.com/) format.

**CLAUDE.md** — A markdown file in the repo root that provides persistent
project context to Claude Code (and Claude in Cowork mode). Lean, top-priority
context — ad-hoc context goes in `docs/` instead.

**CORS (Cross-Origin Resource Sharing)** — Browser security model that controls
which origins may call the API. wa'kijo allow-lists the `CORS_ORIGIN` env var
and rejects everything else.

**cuid** — Collision-resistant unique identifier — wa'kijo's default primary-key
format. URL-safe, sortable by creation time.

**cursor pagination** — A pagination scheme where the client passes the last
item's ID (`cursor`) to fetch the next page. Stable under concurrent writes,
unlike offset pagination. Default for any list endpoint that could exceed 1k
rows.

---

## D

**DTO (Data Transfer Object)** — A typed shape describing the JSON body of a
request or response. wa'kijo defines DTOs as Zod schemas in
`packages/shared/src/dto/` and reuses them on the frontend.

**deletedAt / soft delete** — wa'kijo never hard-deletes user data by default.
Instead, sets `deletedAt = NOW()` and filters `deletedAt: null` on every read.
Hard deletes happen only in scheduled cleanup jobs.

**DLQ (dead-letter queue)** — A queue for jobs that have failed all retries.
Inspected manually via Bull-Board.

---

## E

**ESLint** — JavaScript / TypeScript linter. wa'kijo's exact ESLint config ships
in Phase 5; until then `pnpm lint` is a placeholder and Prettier handles
formatting.

**event** — In wa'kijo, a domain occurrence (`contact.created`,
`message.delivered`, `member.role.changed`) emitted to a BullMQ queue for async
processing. Customers can hook in via processor classes — see
[`customization.md`](customization.md) § 10.

---

## F

**Fastify** — The HTTP server framework underneath wa'kijo's NestJS application.
Chosen over Express for its higher throughput, lower overhead, and built-in JSON
schema support.

**FR-XXX** — A functional requirement ID, defined in [`prd.md`](prd.md) and
referenced from code, tests, and ADRs.

---

## G

**Google OAuth** — Optional sign-in method, gated by `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`. Disabled if those env vars are absent.

---

## H

**HMAC (Hash-based Message Authentication Code)** — Used by every webhook
provider (Stripe, Billplz, WhatsApp) to sign payloads. wa'kijo verifies the
signature on every inbound webhook before processing.

**HttpOnly cookie** — A cookie flag that prevents JavaScript access. The Better
Auth session cookie is HttpOnly to defend against XSS-based session theft.

---

## I

**idempotency key** — A client-supplied UUID in the `Idempotency-Key` header.
Lets the server safely handle retries by caching the first response and
returning it on duplicate requests within 24 hours.

---

## J

**JWT (JSON Web Token)** — A signed token format. wa'kijo deliberately avoids
JWTs for user sessions — sessions are stored server-side and referenced by an
opaque, HttpOnly cookie. JWTs may appear in third-party integrations (e.g.
Better Auth's internal tokens).

---

## K

**KMS (Key Management Service)** — A managed service (AWS KMS, GCP KMS,
HashiCorp Vault) for storing and rotating encryption keys. wa'kijo recommends
one for any at-rest secret beyond environment variables.

---

## L

**Linear** — Issue tracker the wa'kijo team uses internally. Not exposed to
customers.

---

## M

**Magic link** — A single-use, time-bounded URL emailed to the user that, when
clicked, signs them in. Default expiry: 15 minutes.

**Member** — A Prisma model linking a `User` to an `Organization` with a `role`.
The active member's role drives RBAC for the request.

**Mintlify** — The documentation framework wa'kijo's customer-facing handbook is
built with. Lives under [`../docs-site/`](../docs-site/).

**monorepo** — A single repository containing multiple packages / applications.
wa'kijo uses a pnpm-managed monorepo with `apps/*` and `packages/*`.

---

## N

**NestJS** — A TypeScript framework for building scalable server-side Node.js
applications, layered on top of Fastify (for wa'kijo) or Express.

**Next.js 15** — The React framework wa'kijo's frontend is built with. Uses the
App Router (server components by default).

---

## O

**OpenAPI** — A specification for describing REST APIs. wa'kijo generates
OpenAPI from NestJS controller decorators and exposes it at `/api/docs` (Swagger
UI) and `/api/docs/json`.

**organisation hierarchy** — wa'kijo's 3-level multi-tenancy model: SYSTEM →
AGENCY → WORKSPACE.

**owner / admin / member** — The three default org-level roles, in descending
order of privilege.

---

## P

**PDPA (Personal Data Protection Act)** — Malaysia's data protection law.
wa'kijo's defaults (soft delete, audit logging, redaction) target PDPA
compliance.

**PgBouncer** — A connection pooler in front of PostgreSQL. Recommended for any
production deployment to avoid exhausting Postgres connection slots.

**pnpm** — A fast, disk-efficient package manager. wa'kijo uses pnpm 9.

**Prisma** — The ORM wa'kijo uses to talk to PostgreSQL. Schema in
`packages/db/prisma/schema.prisma`, generated client in `@prisma/client`.

**Public** — A NestJS decorator (`@Public()`) that marks a route as
unauthenticated. Skips both `AuthGuard` and `PermissionGuard`.

---

## R

**RBAC (Role-Based Access Control)** — Permissions assigned to roles, not to
individual users. wa'kijo's permission catalogue lives in
`packages/shared/src/auth/permissions.ts`.

**Redis** — In-memory data store. wa'kijo uses Redis 7 for BullMQ queues and
(Phase 5) cached request context.

**RequestContext** — The TypeScript shape
(`apps/api/src/common/context/request-context.ts`) holding per-request data:
request ID, user ID, org ID, role. Stored in AsyncLocalStorage and read via
`@CurrentUser()` or `getRequestContext()`.

**Resend** — The transactional email provider wa'kijo uses by default. Swappable
via the `EmailProvider` interface (Phase 5+).

---

## S

**shadcn/ui** — A library of unstyled, accessible React components built on
Radix UI primitives and styled with Tailwind. wa'kijo's frontend uses shadcn/ui
for every UI primitive.

**Stripe** — The default `BillingProvider` implementation.

**Swagger UI** — The interactive API documentation served at `/api/docs`.
Auto-generated from NestJS controller decorators. Disabled in production.

**SYSTEM** — The top-level organisation type — represents the platform itself.
One per installation.

---

## T

**Tailwind CSS** — A utility-first CSS framework. wa'kijo's frontend styles are
entirely Tailwind classes plus shadcn/ui CSS variables.

**TanStack Query** — React state library for server state (formerly known as
React Query). Used in wa'kijo for all API data fetching.

**Testcontainers** — A library for spinning up real services (Postgres, Redis)
in Docker for integration tests. wa'kijo uses Testcontainers in the
`pnpm test:integration` suite.

**ToyyibPay** — A Malaysian payment gateway, included as a third
`BillingProvider` implementation alongside Stripe and Billplz.

---

## U

**Unscoped query** — A direct `prisma.<model>.findMany()` call that bypasses the
BaseRepository's tenant filter. **Forbidden** outside explicitly-marked
admin/system code paths.

---

## V

**Vitest** — The unit and integration test runner wa'kijo uses. Faster and more
ergonomic than Jest for ESM-first projects.

---

## W

**WORKSPACE** — The leaf organisation type in the hierarchy. Where end-customer
users do their day-to-day work.

**workspace package** — A package inside the pnpm monorepo, referenced as
`workspace:*` from other packages. wa'kijo has two: `@wa-kijo/db` and
`@wa-kijo/shared`.

---

## Z

**Zod** — A TypeScript-first schema validation library. wa'kijo uses Zod for
every DTO, environment variable, and form schema — single source of truth for
types end-to-end.
