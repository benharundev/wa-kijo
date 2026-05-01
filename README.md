# wa'kijo

> Production-grade SaaS boilerplate — NestJS + Prisma + Better Auth + Next.js.

This is the **foundation** of the wa' product portfolio. Both `wa-kiro`
(WhatsApp Business SaaS) and `wa-lawe` (chess tournament manager) are forked
from this repo at v0.1.

## Status

🚧 **Phase 1 — Repo skeleton** ✅

- pnpm workspace, root tooling, docker-compose for Postgres + Redis.

📋 **Phase 2 — Backend bootstrap** (next)

- NestJS API at `apps/api`, Prisma schema at `packages/db`, first migration.

📋 **Phase 3 — Auth & multi-tenant orgs**

- Better Auth + organisation plugin with custom hierarchy.

📋 **Phase 4 — Frontend bootstrap**

- Next.js 15 at `apps/web` with shadcn/ui.

## Prerequisites

- **Node.js 22 LTS** (use `nvm use` — `.nvmrc` is set)
- **pnpm 9** (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** with Compose v2 (for local Postgres + Redis)

## Quick start (Phase 1)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example .env

# 3. Start Postgres + Redis
pnpm docker:up

# 4. Verify they're healthy
docker compose -f docker-compose.dev.yml ps

# 5. Connect to Postgres (sanity check)
docker exec -it wa-kijo-postgres psql -U wakijo -d wakijo -c '\dt'
```

You should see Postgres reporting "Did not find any relations." That's correct —
no schema yet. We add it in Phase 2.

## Project structure

```
wa-kijo/
├── apps/
│   ├── api/              # NestJS backend (Phase 2)
│   └── web/              # Next.js frontend (Phase 4)
├── packages/
│   ├── db/               # Prisma schema + migrations (Phase 2)
│   └── shared/           # Zod schemas, shared types (Phase 2)
├── docs/                 # PRD, architecture, runbooks
├── scripts/              # Tooling helpers
├── .claude/rules/        # Modular Claude Code instructions
├── CLAUDE.md             # Project memory for Claude Code
└── docker-compose.dev.yml
```

## Working with Claude Code

This repo is set up for Claude Code as the primary AI pair-programmer. See
`CLAUDE.md` for the project memory rules. The `.claude/rules/` directory
contains modular rules loaded based on what files you're touching.

To start a Claude Code session:

```bash
claude
```

Recommended first prompt:

> Read @CLAUDE.md and @.claude/rules/backend.md. Following the nestjs-prisma
> skill, scaffold the apps/api skeleton. Draft a plan first; do not write code
> yet.

## Common scripts

| Command            | What it does                        |
| ------------------ | ----------------------------------- |
| `pnpm dev`         | Run all apps in parallel (Phase 2+) |
| `pnpm test`        | Run all tests across workspaces     |
| `pnpm lint`        | Lint all workspaces                 |
| `pnpm typecheck`   | TypeScript check across workspaces  |
| `pnpm format`      | Prettier-format the entire repo     |
| `pnpm docker:up`   | Start Postgres + Redis              |
| `pnpm docker:down` | Stop them                           |
| `pnpm db:migrate`  | Run Prisma migrations (Phase 2+)    |
| `pnpm db:studio`   | Open Prisma Studio (Phase 2+)       |

## License

UNLICENSED. Pre-launch. License terms will be set when wa'kijo ships publicly.
