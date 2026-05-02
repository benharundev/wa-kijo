# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **What this is:** Persistent project context loaded by Claude Code at every
> session. Keep it lean. Ad-hoc context goes in `docs/` and is referenced via
> `@docs/file.md` when needed.

## What wa'kijo is

A production-grade, opinionated SaaS boilerplate for NestJS-first developers
building multi-tenant B2B SaaS. **This is a sellable product**, not a private
internal scaffold. Code quality, documentation, and consistency are P0 features,
not nice-to-haves.

Customers buy a private GitHub repo + Mintlify docs + 6–24 months of updates
depending on tier.

**See `@docs/prd.md` for full scope. See `@docs/architecture.md` for decision
rationale.**

## Current phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Repo skeleton, tooling, Docker Compose, tsconfig | ✅ Complete |
| 2 | NestJS API scaffold, Prisma schema, BaseRepository | ✅ Complete |
| 3 | Better Auth, multi-tenant org hierarchy | ✅ Complete |
| 4 | Next.js frontend scaffold | ✅ Complete |

`apps/api/`, `apps/web/`, and `packages/db/` are **package.json-only
placeholders** until their respective phases are complete. Do not assume source
files exist there.

## Tech stack — non-negotiable

- **Backend:** NestJS 11 (Fastify adapter, NOT Express) + Prisma 5 + PostgreSQL
  16
- **Auth:** Better Auth ≥1.5 with extended organisation plugin (parent–child
  hierarchy, `orgType` field)
- **Frontend:** Next.js 15 (App Router) + shadcn/ui + Tailwind + TanStack Query
- **Validation:** Zod end-to-end (DTOs, env, forms — single source of truth)
- **Jobs:** BullMQ + Redis 7
- **Email:** Resend + React Email
- **Billing:** Stripe (default) + Billplz / ToyyibPay (Malaysian) behind a
  common `BillingProvider` interface
- **Package manager:** pnpm 9. Always.
- **Node:** 22 LTS. Enforced via `engines`.

## Project structure

```
wa-kijo/
├── apps/
│   ├── api/              # NestJS  (@wa-kijo/api)
│   └── web/              # Next.js (@wa-kijo/web)
├── packages/
│   ├── db/               # Prisma schema + migrations (@wa-kijo/db)
│   └── shared/           # Zod schemas, types shared by api + web (@wa-kijo/shared)
├── docs/                 # PRD, architecture, runbook (referenced ad-hoc)
└── .claude/rules/        # backend.md, frontend.md, testing.md, security.md
```

## Always do these

1. **Use the BaseRepository pattern** for all data access. See the
   `nestjs-prisma` skill for the canonical implementation.
2. **Soft delete by default.** No hard deletes outside explicit cleanup jobs.
3. **Audit log all mutations** on flagged entities via Prisma middleware.
4. **Tenant-scope every query** via the BaseRepository's tenant middleware. No
   raw `prisma.<model>.findMany` outside of admin/system code.
5. **Cursor pagination** for any list endpoint that could grow past 1k rows.
   Offset pagination is admin-only.
6. **Zod schemas in `packages/shared/`** are the single source of truth for
   types. Don't duplicate in api or web.
7. **Strict TypeScript.** No `any`. If you really need to escape, use `unknown`
   and narrow.
8. **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`,
   `chore:`. Enforced via commitlint.
9. **Document architectural decisions** as ADRs in
   `docs/decisions/NNNN-title.md`. Future buyers will read these.

## Never do these

- ❌ Hand-edit Prisma migrations. Always use `prisma migrate`.
- ❌ Hard-code English strings. All user-facing text goes through i18n.
- ❌ Use `prisma.$queryRaw` without a comment explaining why and a soak test.
- ❌ Add a runtime dependency without justifying it in the PR description.
- ❌ Skip tests on auth, billing, or tenant-isolation code paths.
- ❌ Write unicode bullets `•` directly when generating docx in tools (use
  proper list formatting).

## Build commands

```bash
# First-time local setup
cp .env.example .env
pnpm install              # postinstall auto-runs prisma generate
pnpm docker:up            # start Postgres 16 + Redis 7
pnpm db:migrate           # apply migrations (name prompt: "init_schema")
# Note: ports default to 5434 (Postgres) and 6381 (Redis) to avoid
# conflicts with other local services (see .env.example).

# Day-to-day
pnpm dev                  # run api + web with hot reload
pnpm build                # production build (both apps)
pnpm test                 # unit + integration tests (all packages)
pnpm test:e2e             # Playwright
pnpm lint                 # ESLint + Prettier check
pnpm typecheck            # tsc --noEmit
pnpm format               # auto-format all files

# Run a single test file
pnpm --filter @wa-kijo/api test -- --run src/modules/contacts/contacts.service.spec.ts

# Database
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # seed dev data
pnpm db:studio            # open Prisma Studio

# Docker helpers
pnpm docker:up            # start dev containers (detached)
pnpm docker:down          # stop dev containers
pnpm docker:logs          # tail container logs
```

## Workspace package build pattern

`packages/shared` and `packages/db` are source-first packages. They use **conditional
exports**: TypeScript resolves the `types` condition (`.ts` source), Node.js resolves
the `require` condition (`dist/` CJS build). Before starting the API in dev mode, both
packages are auto-built by the dev script (`pnpm dev` handles this). After editing code
in a workspace package, run `pnpm --filter @wa-kijo/shared build` (or `@wa-kijo/db`) to
update the CJS output — otherwise the running API still sees the old compiled version.

## TypeScript config

`tsconfig.base.json` at the root applies to all packages. Key settings future
Claude instances must know when scaffolding backend code:

- `target: ES2022`, `module: NodeNext`
- `experimentalDecorators: true` + `emitDecoratorMetadata: true` — required for
  NestJS dependency injection
- `strict: true` — no implicit any, strict null checks enforced

## Skills to consult

- `nestjs-prisma` — every backend module
- `nestjs-better-auth` — anything auth or org-related
- `frontend-design` — every new page or component
- `webapp-testing` — E2E test scaffolding

## What this product is NOT

- Not a Next.js fullstack starter. We have a separable NestJS backend.
- Not a CMS or marketing-site builder.
- Not opinion-free. Buyers who want zero opinions should buy something else.
- Not Express/Hono/Drizzle/MongoDB. Stack is fixed.

## Where to look first when stuck

- Architecture rationale → `@docs/architecture.md`
- Specific feature requirements → `@docs/prd.md` (search by FR-XXX ID)
- API design conventions → `@.claude/rules/backend.md`
- Security patterns → `@.claude/rules/security.md`
- Operational procedures → `@docs/runbook.md`
