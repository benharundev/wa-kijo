# wa'kijo

> Production-grade, opinionated SaaS boilerplate for NestJS-first developers building multi-tenant B2B SaaS.

**wa'kijo** is the foundation of the wa' product portfolio. `wa-kiro` (WhatsApp Business SaaS) and `wa-lawe` (chess tournament manager) are both forked from this repo. Customers who purchase wa'kijo receive a private GitHub repo, Mintlify docs, and 6–24 months of updates depending on tier.

---

## What's included

| Layer | Technology | Notes |
|---|---|---|
| API | NestJS 11 + Fastify | High-throughput adapter, not Express |
| Database | Prisma 5 + PostgreSQL 16 | Soft deletes, audit fields, cursor pagination |
| Auth | Better Auth ≥1.5 | Email/password, magic link, Google OAuth, session cookies |
| Multi-tenancy | Parent–child org hierarchy | SYSTEM → AGENCY → WORKSPACE with role inheritance |
| Frontend | Next.js 15 (App Router) | shadcn/ui, Tailwind, TanStack Query, React Hook Form |
| Validation | Zod end-to-end | Single schema shared by API and frontend |
| Jobs | BullMQ + Redis 7 | Retry, dead-letter queue, Bull Board admin panel |
| Email | Resend + React Email | Verification, magic link, invitation templates |
| Billing | Stripe + Billplz/ToyyibPay | Malaysian payment gateway support out of the box |
| Observability | Pino structured logs + Sentry | Request IDs, PII redaction, log levels |
| Dev tooling | pnpm 9, Vitest, Playwright, Docker Compose | Monorepo-ready |

---

## Prerequisites

- **Node.js 22 LTS** — `nvm install 22 && nvm use 22`
- **pnpm 9** — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- **Docker** with Compose v2

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — minimum: BETTER_AUTH_SECRET, DATABASE_URL, RESEND_API_KEY, EMAIL_FROM

# 3. Start Postgres 16 + Redis 7
pnpm docker:up

# 4. Apply database migrations
pnpm db:migrate

# 5. Seed dev data (users + 3-org hierarchy)
pnpm db:seed

# 6. Start dev servers
pnpm dev
```

| Service | URL |
|---|---|
| Web app | http://localhost:3001 |
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api/docs |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

### Dev credentials

Created automatically by `pnpm db:seed`:

| Email | Password | Role |
|---|---|---|
| admin@example.com | password123 | Owner — wa'kijo HQ (SYSTEM) |
| agency@example.com | password123 | Owner — Acme Agency (AGENCY) |
| member@example.com | password123 | Member — Acme Workspace (WORKSPACE) |

---

## Project structure

```
wa-kijo/
├── apps/
│   ├── api/                  # NestJS backend  (@wa-kijo/api)
│   └── web/                  # Next.js frontend (@wa-kijo/web)
├── packages/
│   ├── db/                   # Prisma schema, migrations, seed (@wa-kijo/db)
│   └── shared/               # Zod DTOs + types shared by api and web (@wa-kijo/shared)
├── docs/
│   ├── architecture.md       # System design, request flow, tenant model
│   ├── runbook.md            # Day-to-day operations reference
│   └── decisions/            # Architecture Decision Records (ADRs)
└── .claude/rules/            # Claude Code context (backend, frontend, security, testing)
```

---

## Scripts reference

```bash
# Development
pnpm dev                    # Start api + web with hot reload
pnpm build                  # Production build (both apps)

# Testing
pnpm test                   # Unit tests (Vitest, all packages)
pnpm test:integration       # Integration tests — real Postgres via Testcontainers
pnpm test:e2e               # End-to-end (Playwright — auto-starts api + web)

# Code quality
pnpm lint                   # ESLint + Prettier check
pnpm typecheck              # tsc --noEmit across all packages
pnpm format                 # Auto-format everything

# Database
pnpm db:migrate             # Prisma migrate dev (prompts for migration name)
pnpm db:seed                # Seed dev users + organisations
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:up              # Start Postgres 16 + Redis 7 (detached)
pnpm docker:down            # Stop containers
pnpm docker:logs            # Tail container logs

# Scoped
pnpm --filter @wa-kijo/api  test -- --run src/path/to/file.spec.ts
pnpm --filter @wa-kijo/shared build   # Rebuild after editing shared package
```

---

## Architecture overview

See [`docs/architecture.md`](docs/architecture.md) for the full design.

**Key points:**

- Every request runs through an `AsyncLocalStorage` context populated by `AuthGuard`. Services and repositories read `orgId`, `userId`, and `userRole` from this context without prop-drilling.
- Better Auth mounts at `/api/auth/*` via a Fastify `onRequest` hook **before** the NestJS pipeline. CORS for auth routes is handled separately at this hook level.
- `BaseRepository<T>` auto-scopes every query to `ctx.orgId`. Raw `prisma.<model>` calls outside `BaseRepository` are forbidden except for system-level queries.
- Role inheritance: `owner` in an AGENCY org automatically inherits `owner` authority in all child WORKSPACEs (depth limit: 3 levels).

---

## Multi-tenant model

```
SYSTEM org       ← the SaaS platform itself (one per installation)
└── AGENCY       ← customer managing multiple client accounts
    └── WORKSPACE    ← individual client workspace
```

Users belong to orgs via the `Member` table with a role of `owner`, `admin`, or `member`. The active org is tracked in the Better Auth session and validated on every request.

---

## Adding a feature module

```bash
# 1. Add the Prisma model in packages/db/prisma/schema.prisma, then migrate
pnpm db:migrate

# 2. Add a Zod DTO to packages/shared/src/dto/<feature>.ts, then rebuild
pnpm --filter @wa-kijo/shared build

# 3. Scaffold under apps/api/src/modules/<feature>/
#    <feature>.module.ts      — NestJS module wiring
#    <feature>.controller.ts  — HTTP endpoints, @ApiTags, @RequirePermission
#    <feature>.service.ts     — business logic
#    <feature>.repository.ts  — extends BaseRepository<T>

# 4. Import the new module in apps/api/src/app.module.ts
```

Consult the `nestjs-prisma` skill in Claude Code for the canonical pattern with full examples.

---

## Environment variables

See [`.env.example`](.env.example) for the full reference with descriptions.

**Minimum required:**

| Variable | Example |
|---|---|
| `DATABASE_URL` | `postgres://wakijo:wakijo@localhost:5434/wakijo` |
| `BETTER_AUTH_SECRET` | 32-char random string — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `noreply@yourdomain.com` |

---

## License

UNLICENSED. License terms will be set when wa'kijo ships publicly.
