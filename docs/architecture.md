# Architecture

This document describes the system design of wa'kijo: how the layers fit together, why key decisions were made, and what a developer needs to understand before touching production code.

---

## System overview

wa'kijo is a **pnpm monorepo** with two applications and two shared packages:

```
wa-kijo/
├── apps/api      NestJS 11 + Fastify — REST API, auth, business logic
├── apps/web      Next.js 15 (App Router) — React frontend
├── packages/db   Prisma schema + migrations — single source of DB truth
└── packages/shared  Zod schemas + RBAC types — shared by api and web
```

The API and frontend are **independently deployable**. The frontend calls the API over HTTP; they do not share a server process. This makes it straightforward to scale them separately or replace the frontend entirely.

---

## Request lifecycle

Every authenticated HTTP request to the API passes through this pipeline:

```
Client
  │
  ▼
Fastify onRequest hook #1
  → AsyncLocalStorage.run({ requestId, userId: '', orgId: '', ... })
  → Initialises a per-request context store for the entire async chain

Fastify onRequest hook #2
  → Matches /api/auth/* routes
  → Sets CORS headers on reply.raw (bypassed by toNodeHandler)
  → Handles OPTIONS preflight — responds 204, stops here
  → Otherwise: calls Better Auth's toNodeHandler(auth)(req.raw, reply.raw)
  → Returns reply — Fastify lifecycle stops, NestJS never sees auth routes

NestJS pipeline (all other routes)
  │
  ├── APP_GUARD #1: AuthGuard
  │     Reads session cookie via Better Auth API
  │     Calls AuthService.resolveContext() → fetches Member + org hierarchy
  │     Mutates the AsyncLocalStorage store with userId, orgId, userRole, etc.
  │     Routes decorated @Public() skip this guard entirely
  │
  ├── APP_GUARD #2: PermissionGuard
  │     Reads @RequirePermission('resource:action') metadata
  │     Calls hasPermission(ctx.userRole, permission) from @wa-kijo/shared
  │     Routes without @RequirePermission are open to any authenticated user
  │
  ├── Controller
  │     @CurrentUser() injects the RequestContext from AsyncLocalStorage
  │     Calls service methods, passing ctx
  │
  ├── Service
  │     Business logic; reads ctx as needed
  │     Calls repository methods
  │
  └── Repository (extends BaseRepository<T>)
        Every query is automatically scoped to ctx.orgId
        Soft-delete filter (deletedAt: null) applied by default
        Cursor pagination for list queries
```

**Response shape** — all non-health, non-auth endpoints return:

```json
// Success (TransformInterceptor)
{ "success": true, "data": { ... }, "timestamp": "2026-05-02T..." }

// Error (HttpExceptionFilter)
{ "success": false, "statusCode": 422, "error": "VALIDATION_ERROR", "message": "...", "timestamp": "...", "path": "..." }
```

---

## Authentication

Better Auth is mounted as an HTTP handler **outside** the NestJS pipeline. This is necessary because:

1. Better Auth reads the raw request body stream. NestJS's body parsing middleware would consume it first.
2. Better Auth manages its own JSON response shape; wrapping it in NestJS's `TransformInterceptor` would break it.

**Session flow:**

```
Sign in → Better Auth sets HttpOnly cookie (wa-kijo.session_token)
         ↓
Subsequent requests → AuthGuard calls auth.api.getSession({ headers })
                     → 5-minute cookie cache prevents DB hit on every request
                     → Full session loaded → AuthService.resolveContext()
```

**Better Auth config summary:**

| Setting | Value |
|---|---|
| Session expiry | 30 days, sliding (renews every 24h) |
| Cookie | HttpOnly, SameSite=Lax, Secure in production |
| Cookie prefix | `wa-kijo` |
| Email verification | Required before first sign-in |
| Magic link expiry | 15 minutes, single-use |

---

## Multi-tenant model

### Organisation hierarchy

```
SYSTEM    ← the SaaS platform itself; one per installation
└── AGENCY    ← a customer managing multiple client accounts
    └── WORKSPACE    ← an individual client's workspace
```

All three levels are the same `Organization` Prisma model, distinguished by the `orgType` field. The `parentOrgId` field links child to parent.

### Tenant scoping

Every domain entity has an `organizationId` (or `orgId`) column. `BaseRepository` injects `ctx.orgId` into every Prisma query via its `tenantWhere()` method, which subclasses implement. This prevents cross-tenant data leakage at the database layer.

**Cross-tenant access is the most critical bug class in this product.** See `ADR-0001` and `.claude/rules/security.md` for the full ruleset.

### Role inheritance

A user can be a `Member` of multiple orgs simultaneously, each with its own role. When a session has an active org:

1. `AuthService.resolveContext()` loads the user's direct role in that org.
2. It then walks up the org hierarchy (up to 3 levels) via `resolveEffectiveRole()`.
3. The highest role across the chain is used. An `owner` in a parent AGENCY org therefore has `owner` authority in all child WORKSPACEs.

Role precedence: `owner (30) > admin (20) > member (10)`

---

## RBAC

Permissions are defined in `packages/shared/src/auth/permissions.ts` as a static map:

```ts
export const PERMISSIONS = {
  'member:invite':      ['owner', 'admin'],
  'member:remove':      ['owner'],
  'org:update':         ['owner', 'admin'],
  'billing:manage':     ['owner'],
  // ...
} satisfies Record<string, readonly Role[]>;
```

This is the **single source of truth** used by both:
- `@RequirePermission('member:invite')` on API controllers (server-side enforcement)
- `useCan()` / `<Can do="..." />` in the frontend (UX hint only — not a security boundary)

Adding a new permission requires only a new entry in this map. No guard code changes needed.

---

## Database

### Schema conventions

| Convention | Detail |
|---|---|
| IDs | `cuid()` — URL-safe, globally unique |
| Timestamps | `createdAt`, `updatedAt` on every model |
| Soft delete | `deletedAt`, `deletedBy` on User and Organization |
| Audit | `createdBy`, `updatedBy` on mutable models |
| Enums | Stored as `String`, not Prisma enum (Better Auth compatibility) |
| Table names | Lowercase via `@@map` (Better Auth adapter requirement) |

### Soft delete

`BaseRepository.findAll()` and `findById()` filter `deletedAt: null` by default. Pass `{ includeDeleted: true }` to opt out. Hard deletes only happen in scheduled cleanup jobs.

### Cursor pagination

All list endpoints use cursor-based pagination:

```json
{ "data": [...], "nextCursor": "cuid..." | null, "hasMore": true }
```

Offset pagination is available only in admin/system endpoints where tables are small and consistency requirements are relaxed.

---

## Shared package build pattern

`packages/shared` and `packages/db` use **conditional exports**:

```json
"exports": {
  ".": {
    "types":   "./src/index.ts",     // TypeScript resolves source directly
    "require": "./dist/index.js"     // Node.js runtime resolves built CJS
  }
}
```

After editing a shared package, run:

```bash
pnpm --filter @wa-kijo/shared build
# or
pnpm --filter @wa-kijo/db build
```

Otherwise the running API process still sees the old compiled output.

---

## Module structure

Every feature follows this layout:

```
apps/api/src/modules/<feature>/
├── <feature>.module.ts        NestJS module — wires deps, exports service
├── <feature>.controller.ts    HTTP routes, guards, Swagger decorators
├── <feature>.service.ts       Business logic
├── <feature>.repository.ts    extends BaseRepository<T>
├── dto/                       (if feature-specific DTOs not in packages/shared)
└── <feature>.service.spec.ts  Unit tests
```

**Controller pattern:**

```ts
@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  findAll(@CurrentUser() ctx: RequestContext) {
    return this.contacts.findAll(ctx);
  }

  @Post()
  @RequirePermission('contact:create')
  create(@CurrentUser() ctx: RequestContext, @Body() dto: CreateContactDto) {
    return this.contacts.create(ctx, dto);
  }
}
```

**Repository pattern:**

```ts
export class ContactsRepository extends BaseRepository<...> {
  protected tenantWhere(ctx: RequestContext) {
    return { organizationId: ctx.orgId };
  }
}
```

---

## Frontend

The Next.js app uses two route groups:

```
app/(auth)/     Public auth pages — sign-in, sign-up, magic-link, reset-password
app/(app)/      Protected shell — requires active session (server-side guard in layout.tsx)
```

**Data fetching pattern:**

```ts
// TanStack Query + auth-aware fetcher
const { data } = useQuery({
  queryKey: ['contacts', orgId],
  queryFn: () => fetcher<ContactList>('/api/v1/contacts'),
});
```

`fetcher` in `apps/web/src/lib/fetcher.ts` always sends `credentials: 'include'`, redirects on 401, and throws typed `ApiError` on non-2xx responses.

**Server vs client component decisions:**

| Need | Component type |
|---|---|
| Session guard in layout | Server component + `getSession()` |
| Reactive session in UI | Client component + `useSession()` |
| Static page, no browser APIs | Server component |
| Form, dialog, toggle, dropdown | Client component |

---

## Architecture Decision Records

| ADR | Decision |
|---|---|
| [0001](decisions/0001-better-auth-with-org-hierarchy.md) | Better Auth ≥1.5 with extended org plugin for parent–child hierarchy |

New decisions should be documented as `docs/decisions/NNNN-title.md` before implementation. Future customers and maintainers will read these.
