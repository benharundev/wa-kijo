# ADR 0002 — pnpm 9 monorepo with apps/_ and packages/_

**Date:** 2026-04-01 **Status:** Accepted **Deciders:** wa-kijo core team

---

## Context

wa'kijo ships two applications (`apps/api` and `apps/web`) that share a small
but critical body of code: the Prisma schema, generated client, Zod DTOs, and
the RBAC permission catalogue. Duplicating this code across two repositories
would guarantee they drift, break, and leak bugs into customers' production
environments.

We needed a workspace structure that:

- Keeps shared code as **source-first** so a single edit + typecheck reveals all
  consumers.
- Lets each app have its own dependencies and scripts without inheriting the
  other's weight.
- Has fast, deterministic installs (we run `pnpm install` on every CI step and
  every customer's first clone).
- Is familiar to NestJS-first developers so customers don't have to learn
  monorepo theory before reading the code.

---

## Decision

**We use a pnpm 9 workspace with two top-level directories:**

- `apps/*` — runtime applications. Each has a `package.json`, builds
  independently, and is independently deployable.
- `packages/*` — shared workspace packages, referenced as `workspace:*` from the
  apps.

The current packages are `@wa-kijo/db` (Prisma schema + client + migrations) and
`@wa-kijo/shared` (Zod DTOs, RBAC types, env schema). Both use **conditional
exports** so TypeScript resolves their `.ts` source while Node.js at runtime
resolves the compiled `dist/` CJS output.

Node.js 22 LTS and pnpm 9.15.0 are pinned via the root `engines` field and an
`.nvmrc` file at the repo root.

---

## Alternatives considered

### Turborepo / Nx

- Built-in task pipelining and remote caching — appealing for large repos.
- **Why rejected:** Two apps and two packages don't justify a build
  orchestrator. Customers would need to learn another tool to add a feature
  module. We can adopt Turborepo later if the dep graph grows; pnpm scripts
  handle today's needs.

### Yarn workspaces / npm workspaces

- Both work. Yarn 4 has improved a lot.
- **Why rejected:** pnpm's content-addressable store is meaningfully faster on
  cold installs and uses less disk. The strict module resolution (no phantom
  dependencies) catches a class of bugs at install time. Customers cloning into
  a fresh CI runner save real time.

### Single-package repository

- Just `src/api`, `src/web`, `src/shared` in one root `package.json`.
- **Why rejected:** Couples the apps' dependency trees. A frontend-only package
  update can break the API's lockfile resolution. We'd lose the per-app `dev`,
  `build`, `test` script clarity.

### Multi-repo (one repo per app + a published shared package)

- Cleanest separation; each repo can have its own release cadence.
- **Why rejected:** Forces a publish step (private npm registry) on every shared
  change. Bumps friction on the most-edited code. Customers would need to clone
  three repos and orchestrate them.

---

## Consequences

### Positive

- One `pnpm install` at the root sets up everything.
- Atomic commits across apps + shared code keep the history coherent.
- TypeScript "go to definition" jumps to source, not built `.d.ts` — faster
  onboarding.
- Customers add new apps (e.g. an admin portal) without restructuring.

### Negative

- Workspace packages (`@wa-kijo/db`, `@wa-kijo/shared`) need to be rebuilt after
  edits before the API picks them up — `pnpm dev` does this automatically, but
  ad-hoc scripts must remember to. Documented in `CLAUDE.md` and `runbook.md`.
- pnpm's `node_modules` symlink layout occasionally surprises tooling (some
  linters, some bundlers). We've not hit this in practice but it's a known
  trade-off.
- Customers used to npm or Yarn must enable Corepack — one extra command,
  documented in `runbook.md`.

### Neutral

- The `apps/*` + `packages/*` convention is widely understood, but a customer
  who wants `services/*` + `libs/*` will need to update `pnpm-workspace.yaml`
  and the root scripts.

---

## Implementation notes

- `pnpm-workspace.yaml` declares `apps/*` and `packages/*`.
- Root `package.json` `scripts` use `pnpm -r` for repo-wide commands and
  `pnpm --filter @wa-kijo/<pkg>` for scoped commands.
- Each workspace package's `exports` field provides both a `types` condition
  pointing at source (for TS resolution) and `require` / `import` conditions
  pointing at `dist/` (for runtime). Pattern is documented in
  `docs/architecture.md` § "Shared package build pattern".

---

## References

- pnpm workspaces: https://pnpm.io/workspaces
- Conditional exports rationale:
  https://nodejs.org/api/packages.html#conditional-exports
- Related: ADR-0005 (BaseRepository, lives in `packages/db` — depends on this
  layout).
