# ADR 0001 — Better Auth with Parent-Child Org Hierarchy

**Date:** 2026-05-02
**Status:** Accepted
**Deciders:** wa-kijo core team

---

## Context

wa-kijo targets agencies and SaaS companies that manage multiple sub-tenants
(brands, clients, workspaces). This requires a multi-level tenancy model:
- **AGENCY** — the top-level billing entity; manages many WORKSPACE orgs
- **WORKSPACE** — an end-customer tenant; daily users work here
- **SYSTEM** — platform-level ops (support tooling, billing overrides)

We also needed a production-grade auth library that covers email/password,
magic link, OAuth, email verification, and session management without us
owning the crypto.

---

## Decision

**Use Better Auth ≥1.5 with the built-in `organization` plugin, extended with
two additional fields (`parentOrgId`, `orgType`) via the plugin's
`schema.organization.additionalFields` config.**

Session lifecycle (HttpOnly cookies, argon2id password hashing, magic-link
expiry) is fully delegated to Better Auth. The organization plugin handles
membership CRUD, invitation flows, and active-org switching.

Better Auth is mounted on Fastify via `toNodeHandler()` in an `onRequest` hook
in `main.ts`. This intercepts `/api/auth/*` before NestJS's request pipeline
so Better Auth reads the raw body stream directly (required for HMAC-signed
webhook payloads).

NestJS DI provides the Better Auth instance via a factory provider in
`AuthModule`. Guards (`AuthGuard`, `PermissionGuard`) are registered globally
via `APP_GUARD` and run on every NestJS route. Session→context resolution is
done in `AuthService.resolveContext()`.

---

## Alternatives considered

### Auth.js (NextAuth)
- Primarily designed for Next.js. Adapting to a standalone NestJS server
  requires significant effort and community plugins.
- No built-in organization/multi-tenant support.
- Rejected: wrong runtime target.

### Lucia Auth
- Low-level: gives primitives, not complete auth flows.
- No magic link or OAuth out of the box. We'd own the email verification,
  session expiry, and token rotation logic.
- More code to maintain, more surface area for bugs.
- Rejected: too much ownership risk for a v1 product.

### Custom JWT implementation
- Requires owning: key management, rotation, revocation, CSRF mitigations,
  secure cookie setup, and refresh token logic.
- Historically the source of auth vulnerabilities in AI-generated code.
- Rejected: violates the "not a crypto library" principle.

### Clerk / Auth0 (hosted)
- Strong products. But buyers of wa-kijo want self-hostable auth — no
  third-party data residency dependency.
- Monthly cost scales with MAUs, affecting boilerplate pricing.
- Rejected: external dependency on SaaS that buyers can't control.

---

## Parent-child hierarchy — deviations from Better Auth defaults

Better Auth's `organization` plugin assumes flat organisations. We added two
fields to the `organization` table to support hierarchy:

| Field | Type | Purpose |
|---|---|---|
| `parentOrgId` | `String?` | FK to the parent org (null for root orgs) |
| `orgType` | `String` | `AGENCY \| WORKSPACE \| SYSTEM` classification |

These are declared as `additionalFields` in the plugin config. Better Auth
stores and returns them transparently; no plugin internals change.

**Hierarchy traversal** is implemented in `AuthService.resolveEffectiveRole()`:
- When populating `RequestContext.userRole`, the service walks up `parentOrgId`
  chains (max 3 levels) and returns the highest role across the chain.
- This means an AGENCY OWNER automatically has `owner` authority in all child
  WORKSPACEs — no duplicate member records required.

**Depth limit:** 3. Enforced in `AuthService.getOrgAncestors()`. Deeper
hierarchies indicate a data modelling problem and should be resolved before
exceeding this limit.

---

## Session → RequestContext flow

```
HTTP request
  ↓
Fastify onRequest hook #1  →  AsyncLocalStorage.run({requestId}, done)
  ↓
Fastify onRequest hook #2  →  /api/auth/* routes → Better Auth handler (returns reply)
  ↓  (non-auth routes continue)
NestJS APP_GUARD #1 (AuthGuard)
  →  auth.api.getSession() validates HttpOnly cookie
  →  AuthService.resolveContext() resolves orgId, orgType, userRole via DB
  →  mutates AsyncLocalStorage store in place
  ↓
NestJS APP_GUARD #2 (PermissionGuard)
  →  reads @RequirePermission metadata
  →  checks PERMISSIONS[permission].includes(ctx.userRole)
  ↓
Controller → Service → BaseRepository
  →  reads ctx.orgId from AsyncLocalStorage
  →  every Prisma query automatically scoped to that org
```

AsyncLocalStorage (not `REQUEST`-scoped providers) is used for context
propagation. `REQUEST` scope in NestJS forces all transitive providers into
request scope, which is expensive with Fastify's concurrency model.

---

## Role names

Better Auth's default org roles are lowercase: `owner`, `admin`, `member`.
wa-kijo uses these directly — no translation layer. Role strings are stored
as-is in `Member.role` (a `String` column, not a Prisma enum, for Better Auth
compatibility).

The permission catalogue in `packages/shared/src/auth/permissions.ts` maps
permissions to role arrays and is the single source of truth for both
server-side enforcement and future client-side `<Can />` components.

---

## Consequences

**Good:**
- Zero custom crypto. Session, password hashing, CSRF, and OAuth are
  library-owned and audited.
- Organization switching, invitation lifecycle, and email verification work
  out of the box.
- The `additionalFields` pattern keeps our schema extensions compatible with
  Better Auth upgrades — no forking.
- Hierarchy role resolution is transparent to all consuming code (just reads
  `ctx.userRole`).

**Trade-offs:**
- `resolveContext()` makes 2 DB queries per authenticated request (session +
  member lookup). Better Auth's cookie cache (5 min TTL) mitigates most reads.
  Full Redis caching of the resolved context is a Phase 4 optimisation.
- Depth-3 hierarchy limit must be documented for buyers and enforced at the
  org-creation endpoint.
- Better Auth routes (`/api/auth/*`) bypass NestJS's exception filter and
  response transform interceptor — errors from those routes have Better Auth's
  own JSON shape, not our `{ error: { code, message } }` envelope.
