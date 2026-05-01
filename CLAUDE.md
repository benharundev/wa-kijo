# wa'kijo — Project Memory

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
│   ├── api/              # NestJS
│   └── web/              # Next.js
├── packages/
│   ├── db/               # Prisma schema + migrations
│   └── shared/           # Zod schemas, types shared by api + web
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
pnpm install              # install deps
pnpm dev                  # run api + web with hot reload
pnpm test                 # unit + integration tests
pnpm test:e2e             # Playwright
pnpm lint                 # ESLint + Prettier check
pnpm typecheck            # tsc --noEmit
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # seed dev data
pnpm build                # production build (both apps)
```

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
