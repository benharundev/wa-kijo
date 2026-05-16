# wa'kijo Full App Infographic

This infographic summarizes the whole wa'kijo application: monorepo structure, runtime architecture, security pipeline, and product flows.

## 1) Monorepo and Runtime Map

```mermaid
flowchart LR
  subgraph Repo["wa-kijo Monorepo"]
    API["apps/api\nNestJS + Fastify"]
    WEB["apps/web\nNext.js App Router"]
    DBPKG["packages/db\nPrisma schema + migrations"]
    SHARED["packages/shared\nZod DTOs + RBAC types"]
  end

  WEB -->|HTTP + cookie session| API
  API -->|Prisma| PG[(PostgreSQL 16)]
  API -->|Jobs| REDIS[(Redis 7 / BullMQ)]
  API -->|Billing| STRIPE[(Stripe)]
  API -->|Email| RESEND[(Resend)]
  API -->|Observability| LOGS[(Pino Logs)]

  DBPKG --> API
  SHARED --> API
  SHARED --> WEB
```

## 2) Secure Request Lifecycle

```mermaid
flowchart TD
  C["Client (Web/API Consumer)"] --> H1["Fastify Hook #1\nInit AsyncLocalStorage context"]
  H1 --> H2{"/api/auth/* ?"}
  H2 -->|Yes| BA["Better Auth raw handler\nCookie/session endpoints"]
  H2 -->|No| G1["AuthGuard\nResolve session + org context"]
  G1 --> G2["PermissionGuard\n@RequirePermission check"]
  G2 --> CTR["Controller + Service"]
  CTR --> REP["BaseRepository<T>"]
  REP --> TS["Tenant scope enforced\n(orgId auto-filter + soft delete default)"]
  TS --> RESP["Unified success/error response"]
```

## 3) Multi-Tenant Access Model

```mermaid
flowchart TD
  SYS["SYSTEM org"] --> AG["AGENCY org"]
  AG --> WS["WORKSPACE org"]

  U["User membership"] --> R["Role: owner/admin/member"]
  R --> INH["Role inheritance (parent -> child)"]
  INH --> RBAC["Permission map (shared package)"]
  RBAC --> APISEC["Server guard enforcement"]
  RBAC --> UIFE["UI permission hints (useCan/Can)"]
```

## 4) End-to-End Product Flow

```mermaid
flowchart LR
  A["Sign up / Sign in"] --> B["Create or join organization"]
  B --> C["Org context selected in session"]
  C --> D["Use modules\nContacts, Conversations, Billing"]
  D --> E["Background processing\nBullMQ jobs"]
  E --> F["External integrations\nStripe + Resend"]
  F --> G["Audit + logs + observability"]
  G --> H["Scale by separating API and Web deployments"]
```

## 5) Core Value Delivered by the App

- Enterprise-ready baseline: auth, RBAC, billing, queues, audit, and observability.
- Safe multi-tenancy by default through request context + repository-level scoping.
- Fast feature delivery via reusable shared DTOs/types across API and Web.
- Production scalability with independently deployable frontend and backend.
