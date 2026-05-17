# Module map

The full wa'kijo app at four zoom levels:

1. **[Monorepo workspace](#1-monorepo-workspace)** — which packages exist and how they depend on each other.
2. **[API NestJS module graph](#2-api-nestjs-module-graph)** — every module wired into `AppModule`, with `@Global()` modules called out and the APP_GUARD chain.
3. **[Inside a feature module](#3-inside-a-feature-module)** — the canonical file layout every new feature should copy.
4. **[Web app structure](#4-web-app-structure)** — Next.js routes, components, hooks, and how they reach the API.

Plus a **[reference table](#module-reference-table)** listing every module and its responsibility.

For the request-time view of how a single HTTP call travels through these modules, see [`service-flow.md`](service-flow.md). For deployment topology, see [`server-architecture.md`](server-architecture.md).

---

## 1. Monorepo workspace

```mermaid
graph TB
    subgraph apps["apps/"]
        api["@wa-kijo/api<br/>NestJS 11 + Fastify<br/><i>long-running process</i>"]
        web["@wa-kijo/web<br/>Next.js 15 (App Router)<br/><i>long-running process</i>"]
    end

    subgraph packages["packages/ (source-first workspace packages)"]
        shared["@wa-kijo/shared<br/>Zod DTOs · permissions · roles · env schema"]
        db["@wa-kijo/db<br/>Prisma client · schema · migrations · seed"]
    end

    api -->|imports| shared
    api -->|imports| db
    web -->|imports| shared
    web -.->|never imports — never accesses DB directly| db

    classDef pkg fill:#fff7ed,stroke:#9a3412,stroke-width:1.5px
    classDef app fill:#eff6ff,stroke:#1e3a8a,stroke-width:1.5px
    class shared,db pkg
    class api,web app
```

**Key invariant:** `apps/web` **never** imports `@wa-kijo/db` directly — it only talks to the API over HTTP. This keeps the frontend safely decoupled from Prisma and the database schema. The shared package is the only thing both apps depend on.

---

## 2. API NestJS module graph

Every box is a NestJS `@Module`. Solid arrows are explicit `imports: […]`; the `APP_GUARD` chain at the bottom is the global request-time pipeline.

```mermaid
graph TB
    App["AppModule<br/>(root)"]

    subgraph Globals["Global modules (@Global() — injectable everywhere after wiring)"]
        Config["ConfigModule<br/>EnvService — Zod-validated env"]
        Prisma["PrismaModule<br/>PrismaService"]
        Redis["RedisModule"]
        Auth["AuthModule<br/>Better Auth + AuthService"]
        Email["EmailModule<br/>Resend + React Email"]
    end

    subgraph Infra["Infrastructure modules"]
        Logger["LoggerModule<br/>nestjs-pino · request-id correlation"]
        Queues["QueuesModule<br/>BullMQ + processors"]
    end

    subgraph Domain["Domain modules"]
        Health["HealthModule<br/>/health liveness"]
        Contacts["ContactsModule<br/>/contacts · /tags"]
        Conversations["ConversationsModule<br/>/conversations · /messages"]
        Billing["BillingModule<br/>/billing/stripe/* · subscriptions"]
    end

    subgraph Guards["APP_GUARD chain (every request)"]
        AG["AuthGuard<br/>#1 — validates session, populates context"]
        PG["PermissionGuard<br/>#2 — checks @RequirePermission"]
    end

    App --> Config
    App --> Logger
    App --> Prisma
    App --> Redis
    App --> Email
    App --> Auth
    App --> Health
    App --> Contacts
    App --> Conversations
    App --> Queues
    App --> Billing
    App --> AG
    App --> PG

    Auth -.uses.-> Prisma
    Auth -.uses.-> Config
    Email -.uses.-> Config
    Queues -.uses.-> Redis
    Queues -.processors call.-> Email

    Contacts -.uses.-> Prisma
    Contacts -.uses.-> Auth
    Conversations -.uses.-> Prisma
    Conversations -.uses.-> Auth
    Conversations -.queues outbound dispatch.-> Queues
    Billing -.uses.-> Prisma
    Billing -.uses.-> Auth
    Billing -.uses.-> Config

    AG -.reads session via.-> Auth
    PG -.reads permissions from.-> SharedRef["@wa-kijo/shared<br/>PERMISSIONS map"]

    classDef root fill:#f1f5f9,stroke:#0f172a,stroke-width:2px,font-weight:bold
    classDef global fill:#f0fdfa,stroke:#0d9488,stroke-width:1.5px
    classDef infra fill:#f5f3ff,stroke:#7c3aed,stroke-width:1.5px
    classDef domain fill:#fff7ed,stroke:#ea580c,stroke-width:1.5px
    classDef guard fill:#fef2f2,stroke:#dc2626,stroke-width:1.5px
    classDef ext fill:#f1f5f9,stroke:#475569,stroke-width:1px,stroke-dasharray:3 3

    class App root
    class Config,Prisma,Redis,Auth,Email global
    class Logger,Queues infra
    class Health,Contacts,Conversations,Billing domain
    class AG,PG guard
    class SharedRef ext
```

**Reading the graph:**

- Solid arrows from `AppModule` → registration order in `apps/api/src/app.module.ts`. The order matters slightly: `ConfigModule` first (everything else reads env), then `Prisma`/`Redis` (data clients), then global services, then domain modules.
- Dotted arrows = runtime dependency (one module's service injected into another). These are not explicit `imports`; they're resolved by NestJS's DI graph because the providing module is `@Global()`.
- The two `APP_GUARD` providers run on every request unless `@Public()` is applied. They are the request-time enforcement layer in front of every controller.

---

## 3. Inside a feature module

The canonical layout every feature module follows. Copy `contacts/` as the reference when scaffolding a new one.

```mermaid
graph TB
    Manifest["<feature>.module.ts<br/>@Module({ controllers, providers, exports })"]

    Controller["<feature>.controller.ts<br/>@ApiTags · @RequirePermission<br/>ZodValidationPipe on DTOs"]
    Service["<feature>.service.ts<br/>business logic<br/>throws typed exceptions"]
    Repository["<feature>.repository.ts<br/>extends BaseRepository&lt;T&gt;<br/>auto-tenant-scoped"]

    subgraph DTOs["dto/"]
        Create["create-&lt;feature&gt;.dto.ts<br/>Zod schema in @wa-kijo/shared"]
        Update["update-&lt;feature&gt;.dto.ts"]
    end

    subgraph Tests["tests"]
        Spec["*.spec.ts<br/>Vitest unit (next to source)"]
        IntSpec["test/integration/&lt;feature&gt;/*<br/>real Postgres via Testcontainers"]
    end

    Manifest -->|controllers| Controller
    Manifest -->|providers| Service
    Manifest -->|providers| Repository

    Controller -->|injects| Service
    Service -->|injects| Repository
    Controller -.validates body.-> Create
    Controller -.validates body.-> Update

    Service -.optional.-> Queue["BullMQ Queue<br/>async work"]
    Service -.optional.-> Events["Domain events<br/>(via BullMQ today)"]

    Repository -->|injects| PrismaService["PrismaService<br/>from @Global() PrismaModule"]

    Service -.unit tested by.-> Spec
    Repository -.cross-tenant tested by.-> IntSpec

    classDef file fill:#fff,stroke:#374151,stroke-width:1.5px
    classDef dto fill:#fff7ed,stroke:#9a3412
    classDef test fill:#f0fdf4,stroke:#16a34a
    classDef ext fill:#e0f2fe,stroke:#075985,stroke-dasharray:3 3

    class Manifest,Controller,Service,Repository file
    class Create,Update dto
    class Spec,IntSpec test
    class PrismaService,Queue,Events ext
```

**Rules of the road:**

- **Controller is pure routing.** Parse the DTO, delegate to the service, return the value. No business logic, no Prisma calls.
- **Service is business logic.** Uses the repository for persistence; throws `BadRequestException` / `NotFoundException` / etc. for error cases; emits BullMQ jobs for async work.
- **Repository extends `BaseRepository<T>`.** Tenant scoping (`where: { organizationId: ctx.orgId }`) and soft-delete filtering (`where: { deletedAt: null }`) are automatic. Direct `prisma.<model>.findMany` calls outside `BaseRepository` are forbidden except for explicit `// EXEMPT: <reason>` cases.
- **DTOs live in `@wa-kijo/shared`** so the frontend uses the exact same Zod schema for its forms. Single source of truth for types.
- **Tests next to source.** `contacts.service.spec.ts` lives next to `contacts.service.ts`. Cross-tenant isolation integration tests live in `apps/api/test/integration/<feature>/`.

---

## 4. Web app structure

```mermaid
graph TB
    subgraph App["app/ (Next.js App Router)"]
        Root["app/page.tsx<br/>landing"]
        AuthGroup["(auth)/<br/>sign-in · sign-up · magic-link · reset"]
        AppGroup["(app)/<br/>server-side session guard in layout.tsx"]

        subgraph AppRoutes["(app)/ authenticated routes"]
            Dashboard["dashboard/"]
            OrgRoutes["orgs/[orgId]/<br/>billing · members · invites · settings"]
            Settings["settings/<br/>profile · sessions · notifications · danger"]
            Onboard["onboarding/create-org/"]
        end
    end

    subgraph Components["components/"]
        UI["ui/<br/>shadcn primitives — button, card, dialog, …"]
        Layout["layout/<br/>Sidebar · TopBar · OrgSwitcher · UserMenu"]
        Can["can.tsx<br/>&lt;Can do='member:invite'&gt; — UX hint only"]
    end

    subgraph Hooks["hooks/"]
        UseCan["use-can<br/>permission check"]
        UseSession["use-session<br/>Better Auth client wrapper"]
        UseToast["use-toast<br/>shadcn toast bridge"]
    end

    subgraph Lib["lib/"]
        AuthClient["auth-client.ts<br/>createAuthClient — signin/signout/session"]
        Fetcher["fetcher.ts<br/>credentials: include · unwraps { success, data } envelope"]
    end

    subgraph Providers["providers/"]
        QueryProvider["QueryProvider<br/>TanStack Query"]
        ThemeProvider["ThemeProvider<br/>light/dark via class attribute"]
    end

    Root --> AuthGroup
    AuthGroup --> AuthClient
    AppGroup --> AppRoutes
    AppGroup --> Layout
    AppRoutes --> Components
    AppRoutes --> Hooks
    AppRoutes -.fetches API via.-> Fetcher

    Layout --> Can
    Can --> UseCan
    UseCan --> SharedPerms["@wa-kijo/shared<br/>PERMISSIONS map"]
    UseSession --> AuthClient

    QueryProvider -.wraps everything in.-> AppGroup
    ThemeProvider -.wraps everything in.-> Root

    Fetcher -.HTTPS · cookie forwarded.-> API["NestJS API<br/>:3000"]

    classDef route fill:#eff6ff,stroke:#1e3a8a,stroke-width:1.5px
    classDef cmp fill:#f5f3ff,stroke:#7c3aed,stroke-width:1.5px
    classDef hook fill:#f0fdfa,stroke:#0d9488,stroke-width:1.5px
    classDef lib fill:#fff7ed,stroke:#9a3412,stroke-width:1.5px
    classDef prov fill:#f0fdf4,stroke:#16a34a,stroke-width:1.5px
    classDef ext fill:#f1f5f9,stroke:#475569,stroke-dasharray:3 3

    class Root,AuthGroup,AppGroup,Dashboard,OrgRoutes,Settings,Onboard route
    class UI,Layout,Can cmp
    class UseCan,UseSession,UseToast hook
    class AuthClient,Fetcher lib
    class QueryProvider,ThemeProvider prov
    class SharedPerms,API ext
```

**Server vs client component decisions:** the route-group `layout.tsx` files are server components — they fetch the session server-side via `getSession({ fetchOptions: { headers: await headers() } })` for the initial guard. Forms, dialogs, and any component that uses TanStack Query are `'use client'`. `<Can>` and `useCan()` are client-side UX hints only — they read the same permission catalogue but the **server `@RequirePermission` is the security boundary**.

---

## Module reference table

| Module | Source | Public surface | Depends on | Tests |
|---|---|---|---|---|
| `AppModule` | `apps/api/src/app.module.ts` | Composes everything below | — | — |
| `ConfigModule` (@Global) | `apps/api/src/config/` | `EnvService.get(key)` | `@wa-kijo/shared` env schema | — |
| `LoggerModule` | `nestjs-pino` (third-party) | `Logger` injection | `ConfigModule` (for log level) | — |
| `PrismaModule` (@Global) | `apps/api/src/prisma/` | `PrismaService` | `@wa-kijo/db` | — |
| `RedisModule` (@Global) | `apps/api/src/redis/` | `IoRedis` client | env: `REDIS_URL` | — |
| `AuthModule` (@Global) | `apps/api/src/auth/` | `BETTER_AUTH` token, `AuthService` | Prisma, Config, Email | unit |
| `EmailModule` (@Global) | `apps/api/src/modules/email/` | `EmailService.send(template, …)` | Config, Resend | unit |
| `QueuesModule` | `apps/api/src/queues/` | `JOB_QUEUE` tokens, processors | Redis, Email | unit |
| `HealthModule` | `apps/api/src/modules/health/` | `GET /health` — liveness + Postgres + Redis ping | Prisma, Redis | unit |
| `ContactsModule` | `apps/api/src/modules/contacts/` | `GET/POST/PUT/DELETE /contacts`, `GET/POST/PUT/DELETE /tags`, `POST /contacts/bulk-import` | Prisma, Auth | unit + integration |
| `ConversationsModule` | `apps/api/src/modules/conversations/` | `/conversations`, `/conversations/:id/messages`, state machine | Prisma, Auth, Queues | unit + integration |
| `BillingModule` | `apps/api/src/modules/billing/` | `GET /billing/plans`, `GET /billing/subscription`, `POST /billing/stripe/checkout`, `POST /billing/stripe/portal`, `POST /billing/stripe/webhook` | Prisma, Auth, Config | unit |
| **`AuthGuard`** (APP_GUARD) | `apps/api/src/common/guards/auth.guard.ts` | Wraps every route — `@Public()` opts out | AuthModule | unit |
| **`PermissionGuard`** (APP_GUARD) | `apps/api/src/common/guards/permission.guard.ts` | `@RequirePermission('resource:action')` enforcement | `@wa-kijo/shared` PERMISSIONS | unit |
| **`TransformInterceptor`** | `apps/api/src/common/interceptors/transform.interceptor.ts` | Wraps success responses as `{ success, data, timestamp }` | — | — |
| **`HttpExceptionFilter`** | `apps/api/src/common/filters/http-exception.filter.ts` | Maps exceptions → `{ success: false, error, message, statusCode }`. Prisma error → HTTP code mapping. | — | — |

---

## Adding a new module — checklist

```
- [ ] Prisma model in packages/db/prisma/schema.prisma + migration
- [ ] Zod DTO in packages/shared/src/dto/<feature>.ts (pnpm --filter @wa-kijo/shared build)
- [ ] apps/api/src/modules/<feature>/
      ├── <feature>.module.ts
      ├── <feature>.controller.ts   (@ApiTags + @RequirePermission)
      ├── <feature>.service.ts
      └── <feature>.repository.ts   (extends BaseRepository<T>)
- [ ] Permission entries in packages/shared/src/auth/permissions.ts
- [ ] Module imported in apps/api/src/app.module.ts
- [ ] Unit tests next to each file (*.spec.ts)
- [ ] Cross-tenant isolation test in apps/api/test/integration/<feature>/
- [ ] CHANGELOG.md entry under [Unreleased]
```

The `contacts/` module is the canonical reference — copy its structure for the cleanest pattern.
