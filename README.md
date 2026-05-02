# wa'kijo

> Production-grade, opinionated SaaS boilerplate for NestJS-first developers building multi-tenant B2B SaaS.

<p>
  <img alt="Node" src="https://img.shields.io/badge/node-22%20LTS-339933?logo=node.js&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-Commercial-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-Phase%204%20%E2%80%94%20feature%20modules%20WIP-yellow">
</p>

**wa'kijo** is the foundation of the wa' product portfolio. `wa-kiro` (WhatsApp Business SaaS) and `wa-lawe` (chess tournament manager) are both forked from this repo. Customers who purchase wa'kijo receive a private GitHub repo, Mintlify docs, and 6–24 months of updates depending on tier.

> 📚 **Looking for the customer-facing docs?** See [`docs-site/`](docs-site/) — the full Mintlify handbook covers concepts, guides, API reference, and troubleshooting.

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

## Documentation

| Path | Audience | Purpose |
|---|---|---|
| [`docs-site/`](docs-site/) | Customers | Mintlify-rendered handbook — concepts, guides, API reference |
| [`docs/architecture.md`](docs/architecture.md) | Engineers | System design, request lifecycle, tenant model |
| [`docs/prd.md`](docs/prd.md) | Engineers, PM | Product requirements, scoped features, FR catalogue |
| [`docs/api-conventions.md`](docs/api-conventions.md) | Engineers | REST conventions, response envelope, error shape |
| [`docs/deployment.md`](docs/deployment.md) | Ops, Customers | Production deployment recipes (Railway, AWS, self-hosted) |
| [`docs/observability.md`](docs/observability.md) | Ops | Logging, tracing, metrics, alerting playbook |
| [`docs/customization.md`](docs/customization.md) | Customers | How to brand, extend, and remove parts you don't need |
| [`docs/upgrade-guide.md`](docs/upgrade-guide.md) | Customers | Upgrading between wa'kijo releases |
| [`docs/runbook.md`](docs/runbook.md) | Engineers | Day-to-day local dev operations |
| [`docs/glossary.md`](docs/glossary.md) | Everyone | Plain-English definitions of every term used |
| [`docs/decisions/`](docs/decisions/) | Engineers | Architecture Decision Records (ADRs) |
| [`docs/api/openapi.yaml`](docs/api/openapi.yaml) | Engineers, integrators | Static OpenAPI 3.1 snapshot of the API |

## Project policies

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — branching, commit conventions, PR process
- [`SECURITY.md`](SECURITY.md) — vulnerability disclosure policy
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — community expectations
- [`SUPPORT.md`](SUPPORT.md) — how to get help (by tier)
- [`CHANGELOG.md`](CHANGELOG.md) — release history (Keep a Changelog format)

## Support tiers

| Tier | Repo access | Updates | Support SLA | Indicative price |
|---|---|---|---|---|
| **Solo** | Private repo, single seat | 6 months of patches | Community (Discord) | from MYR 1,499 |
| **Team** | Private repo, up to 5 seats | 12 months of patches & minor releases | 48-hr business email | from MYR 4,999 |
| **Agency** | Private repo, unlimited seats per legal entity | 24 months incl. major upgrades | 24-hr business email + 1 onboarding call | from MYR 12,999 |
| **Enterprise** | Private repo + custom CLA | 24 months + roadmap influence | Same-business-day Slack Connect | Contact sales |

> Pricing and SLAs are indicative. The current commercial terms ship with the
> repo as `LICENSE` — read it before redistributing.

## License

Commercial license. See [`LICENSE`](LICENSE) for the full terms.

In summary: each purchased seat may use wa'kijo to build and operate one
private commercial product. Redistribution of the source — verbatim or
modified — is not permitted. Open-source dependencies retain their original
licenses.
