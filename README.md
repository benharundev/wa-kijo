# wa'kijo

> Production-grade, opinionated SaaS foundation for NestJS-first teams building
> multi-tenant B2B products.

<p>
  <img alt="Node" src="https://img.shields.io/badge/node-22%20LTS-339933?logo=node.js&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue">
  <img alt="CI" src="https://github.com/benharundev/wa-kijo/actions/workflows/ci.yml/badge.svg">
</p>

**wa'kijo Community** is the open-source foundation: multi-tenant auth, RBAC,
billing, queues, audit log, and a Next.js shell — already production-tested in
[`wa-kiro`](https://github.com/benharundev) (WhatsApp Business SaaS). Clone it,
configure six env vars, and you have a working B2B SaaS scaffold at `localhost`
— no four-week boilerplate slog before you can start on the features that
actually differentiate your product.

> 💰 **Need enterprise features?** wa'kijo Pro adds SSO, SCIM, the 11 shared
> engines (booking, document, notification, communication, …), custom domains,
> audit-log SIEM streaming, the super-admin console, and more. Five tiers from
> Starter to OEM — see
> [`docs/prd.md` §8](docs/prd.md#8-commercial-tiers-and-licensing).

---

## What's included in Community

| Layer         | Technology                                 | Notes                                                                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| API           | NestJS 11 + Fastify                        | High-throughput adapter, not Express                                                             |
| Database      | Prisma 5 + PostgreSQL 16                   | Soft deletes, audit fields, cursor pagination                                                    |
| Auth          | Better Auth ≥1.5                           | Email/password, magic link, Google OAuth, session cookies                                        |
| Multi-tenancy | 3-level org hierarchy                      | SYSTEM → AGENCY → WORKSPACE with role inheritance, tenant-scoped queries via `BaseRepository<T>` |
| Frontend      | Next.js 15 (App Router)                    | shadcn/ui, Tailwind, TanStack Query, React Hook Form                                             |
| Validation    | Zod end-to-end                             | Single schema shared by API and frontend                                                         |
| Jobs          | BullMQ + Redis 7                           | Retry, dead-letter queue, Bull Board admin panel                                                 |
| Email         | Resend + React Email                       | Verification, magic link, invitation templates                                                   |
| Billing       | Stripe                                     | Subscriptions, Customer Portal, webhooks                                                         |
| Audit log     | Built-in                                   | Mutation tracking on flagged entities, append via Prisma middleware                              |
| Observability | Pino structured logs                       | Request IDs, PII redaction, log levels                                                           |
| Dev tooling   | pnpm 9, Vitest, Playwright, Docker Compose | Monorepo-ready, cross-tenant fuzz tests in CI                                                    |

**Not in Community** (lives in wa'kijo Pro): SSO/SAML/OIDC, SCIM 2.0, MFA,
multi-provider billing (Billplz, Curlec), the 11 shared engines (Booking Core,
Workflow, Document, Report, Inventory, Invoice, Notification, Communication,
etc.), white-labeling, custom domains, full i18n, OpenTelemetry/metrics/Sentry,
public API + API keys, outbound webhooks, GDPR data export, field-level
encryption, super-admin console, sandbox/test mode, TypeScript SDK, and the
higher-tier roadmap items. See
[`docs/prd.md` §8.3](docs/prd.md#83-feature-matrix) for the full feature matrix.

---

## Prerequisites

- **Node.js 22 LTS** — `nvm install 22 && nvm use 22`
- **pnpm 9** — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- **Docker** with Compose v2

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/benharundev/wa-kijo.git
cd wa-kijo
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — minimum: BETTER_AUTH_SECRET, DATABASE_URL, RESEND_API_KEY, EMAIL_FROM

# 3. Start Postgres 16 + Redis 7
pnpm docker:up

# 4. Apply database migrations
pnpm db:migrate

# 5. Seed dev data (3 users, 3-org hierarchy, 3 example plans)
pnpm db:seed

# 6. Start dev servers
pnpm dev
```

| Service       | URL                                      |
| ------------- | ---------------------------------------- |
| Web app       | http://localhost:3001                    |
| API           | http://localhost:3000                    |
| Swagger UI    | http://localhost:3000/api/docs           |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

### Dev credentials

Created automatically by `pnpm db:seed`:

| Email                | Password      | Role                                |
| -------------------- | ------------- | ----------------------------------- |
| `admin@example.com`  | `password123` | Owner — wa'kijo HQ (SYSTEM)         |
| `agency@example.com` | `password123` | Owner — Acme Agency (AGENCY)        |
| `member@example.com` | `password123` | Member — Acme Workspace (WORKSPACE) |

### Stripe (optional, for billing testing)

The billing UI works without Stripe keys — it just shows the plans and
"Subscribe" buttons return a clear "not configured" error. To exercise the full
flow:

```bash
# 1. Get test keys at https://dashboard.stripe.com/test/apikeys
# 2. Add them to .env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY
# 3. In one terminal, forward webhooks locally:
stripe listen --forward-to localhost:3000/api/v1/billing/stripe/webhook
# 4. Create matching products and prices in your Stripe dashboard and put the
#    price IDs into the Plan rows (Prisma Studio is easiest for this).
```

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
│   ├── architecture.md       # System design, request lifecycle, tenant model
│   ├── runbook.md            # Day-to-day local-development operations
│   ├── prd.md                # Product requirements + tier feature matrix
│   └── decisions/            # Architecture Decision Records (ADRs)
└── .claude/rules/            # Project-specific Claude Code context
```

---

## Architecture overview

Every authenticated request flows through:

```
Fastify onRequest hook  → AsyncLocalStorage.run({ requestId, userId, orgId, … })
                          /api/auth/* is intercepted here for Better Auth
NestJS AuthGuard        → validates session cookie, populates the context store
NestJS PermissionGuard  → reads @RequirePermission metadata, checks the role map
Controller / Service    → reads context via getRequestContext() — no prop-drilling
BaseRepository<T>       → auto-scopes every query to ctx.orgId — no manual filtering
```

A user with `owner` role in a parent AGENCY org automatically receives `owner`
authority in all child WORKSPACEs (depth limit: 3 levels).
`BaseRepository.findMany` defaults to filtering `deletedAt: null` — pass
`{ includeDeleted: true }` to override. Cross-tenant isolation is asserted by a
fuzz test that runs in CI.

Full architecture in [`docs/architecture.md`](docs/architecture.md).

---

## Multi-tenant model

```
SYSTEM        ← the SaaS operator itself (one per installation)
└── AGENCY    ← customer managing multiple client accounts
    └── WORKSPACE   ← individual client workspace
```

Users belong to orgs via the `Member` table with a role of `owner`, `admin`, or
`member`. The active org is tracked in the Better Auth session and validated on
every request.

---

## Adding a feature module

```bash
# 1. Add the Prisma model in packages/db/prisma/schema.prisma
pnpm db:migrate

# 2. Add a Zod DTO to packages/shared/src/dto/<feature>.ts
pnpm --filter @wa-kijo/shared build

# 3. Scaffold under apps/api/src/modules/<feature>/
#    <feature>.module.ts      — NestJS module wiring
#    <feature>.controller.ts  — HTTP endpoints, @ApiTags, @RequirePermission
#    <feature>.service.ts     — business logic
#    <feature>.repository.ts  — extends BaseRepository<T>

# 4. Import the new module in apps/api/src/app.module.ts
```

The `contacts` module is the canonical reference — copy its structure for the
cleanest pattern.

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
pnpm db:migrate             # Prisma migrate dev
pnpm db:seed                # Seed dev users, orgs, and example plans
pnpm db:studio              # Open Prisma Studio

# Docker
pnpm docker:up              # Start Postgres 16 + Redis 7 (detached)
pnpm docker:down            # Stop containers
pnpm docker:logs            # Tail container logs

# Scoped
pnpm --filter @wa-kijo/api test -- --run src/path/to/file.spec.ts
pnpm --filter @wa-kijo/shared build   # Rebuild after editing shared package
```

---

## Environment variables

See [`.env.example`](.env.example) for the full reference. **Minimum required:**

| Variable             | Example                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`       | `postgresql://wakijo:wakijo_dev_password@localhost:5434/wakijo?schema=public` |
| `BETTER_AUTH_SECRET` | 32-char random string — `openssl rand -base64 32`                             |
| `BETTER_AUTH_URL`    | `http://localhost:3000`                                                       |
| `RESEND_API_KEY`     | `re_...` (sign up free at [resend.com](https://resend.com))                   |
| `EMAIL_FROM`         | `noreply@yourdomain.com`                                                      |

---

## Documentation

| Path                                                 | Purpose                                                   |
| ---------------------------------------------------- | --------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)       | System design, request lifecycle, tenant model            |
| [`docs/prd.md`](docs/prd.md)                         | Product requirements, phase plan, tier feature matrix     |
| [`docs/api-conventions.md`](docs/api-conventions.md) | REST conventions, response envelope, error shape          |
| [`docs/deployment.md`](docs/deployment.md)           | Production deployment recipes (Railway, AWS, self-hosted) |
| [`docs/observability.md`](docs/observability.md)     | Logging, tracing, metrics, alerting playbook              |
| [`docs/runbook.md`](docs/runbook.md)                 | Day-to-day local-development operations                   |
| [`docs/glossary.md`](docs/glossary.md)               | Plain-English definitions of every term used              |
| [`docs/decisions/`](docs/decisions/)                 | Architecture Decision Records (ADRs)                      |

ADR-0011 (the 2026-05-17 platform-thesis reversal) is the most important one for
understanding why the repo is shaped the way it is.

---

## License

[Apache 2.0](LICENSE). Build whatever you want with it — commercial products are
explicitly fine.

**One ask** (not legally binding, just community norm): please don't repackage
wa'kijo itself as a competing boilerplate product. We make our living from
wa'kijo Pro and the higher tiers — the Community edition exists because we
believe a strong open foundation grows the whole ecosystem, not just to be
repackaged. See [`NOTICE`](NOTICE) for the full informal note.

---

## Contributing

Issues and pull requests welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for
the branching model, commit conventions, and PR process. Before opening a big
PR, please open a discussion first so we can align on direction.

## Security

Report vulnerabilities privately per [`SECURITY.md`](SECURITY.md). Please don't
open public issues for security problems.

## Code of conduct

We expect contributors to follow the [Contributor Covenant](CODE_OF_CONDUCT.md).
Be kind. Disagree with ideas, not people.

## Support

| Where                                                                    | What                                          |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| [GitHub Discussions](https://github.com/benharundev/wa-kijo/discussions) | Community Q&A — best-effort, no SLA           |
| [GitHub Issues](https://github.com/benharundev/wa-kijo/issues)           | Reproducible bugs only                        |
| [wa'kijo Pro+](https://github.com/benharundev/wa-kijo-pro)               | Email support with response-time SLAs by tier |

See [`SUPPORT.md`](SUPPORT.md) for details.
