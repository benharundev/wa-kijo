# Contributing to wa'kijo

> **Audience:** internal team, accepted contractors, and customers on the
> Agency / Enterprise tier with write access to the private repo.
>
> Public contributions (forks, pull requests from non-licensees) are not
> accepted at this time. wa'kijo is a commercial product, not an open-source
> project.

This document explains the branching model, commit conventions, code review
expectations, and the local checks every change must pass before it can be
merged. For day-to-day operational guidance see
[`docs/runbook.md`](docs/runbook.md).

---

## Table of contents

1. [Ground rules](#ground-rules)
2. [Local environment](#local-environment)
3. [Branching model](#branching-model)
4. [Commit conventions](#commit-conventions)
5. [Pull request workflow](#pull-request-workflow)
6. [Required local checks](#required-local-checks)
7. [Coding standards](#coding-standards)
8. [Documentation expectations](#documentation-expectations)
9. [Adding a feature module — checklist](#adding-a-feature-module--checklist)
10. [Releasing a version](#releasing-a-version)

---

## Ground rules

- **Quality before speed.** wa'kijo ships to paying customers. A merged change
  is something every customer must accept. If you would not be comfortable
  defending the change in a customer support call, don't merge it.
- **No silent product decisions.** Behaviour-changing or
  architecture-affecting work needs a tracked discussion (Linear ticket, ADR,
  or PR description) and explicit approval from a code owner.
- **Tenant isolation is non-negotiable.** Any change touching a database query
  must be reviewed against [`.claude/rules/security.md`](.claude/rules/security.md)
  and [`docs/architecture.md`](docs/architecture.md).
- **Backwards compatibility for buyers.** Once a release is tagged, public
  APIs, environment variables, and DB schemas are part of the contract. Use
  the upgrade guide and CHANGELOG to coordinate breaking changes.

---

## Local environment

Required tools and exact versions:

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS (22.x) | `nvm install 22 && nvm use 22` |
| pnpm | 9.15.0 | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| Docker | 25+ with Compose v2 | https://docs.docker.com/get-docker/ |
| Git | 2.40+ | system package manager |

Verify the versions match before opening a PR:

```bash
node --version    # v22.x
pnpm --version    # 9.15.x
docker --version  # 25.x or newer
```

Initial setup is documented in [`docs/runbook.md`](docs/runbook.md). If
`pnpm install` fails, that is your first signal to fix the environment, not
the lockfile.

---

## Branching model

We use **trunk-based development with short-lived feature branches**.

```
main                ← always green, deployable, tagged for releases
└─ feat/<scope>     ← feature branches, max 5 working days
└─ fix/<scope>      ← bug fixes
└─ chore/<scope>    ← deps, tooling, CI
└─ docs/<scope>     ← docs-only changes
└─ refactor/<scope> ← internal-only refactors
```

Rules:

- **Branch names are kebab-case** and prefixed with the change type (matches
  the commit prefix). Example: `feat/contacts-bulk-import`.
- **Rebase, do not merge.** Keep the history linear:
  `git pull --rebase origin main` before pushing.
- **Branch lifetime ≤ 5 working days.** Anything longer must be split into
  smaller branches behind a feature flag.
- **No direct pushes to `main`.** Branch protection enforces PR + review.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) — enforced
by `commitlint` via Husky. Format:

```
<type>(<optional scope>): <imperative summary, ≤72 chars>

<optional body — wrap at 100 chars, explain *why*, not *what*>

<optional footer — BREAKING CHANGE: ..., Closes #123>
```

Allowed types:

| Type | Use for |
|---|---|
| `feat` | New user-visible functionality |
| `fix` | Bug fix |
| `refactor` | Internal restructuring, no behaviour change |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `test` | Tests only |
| `chore` | Dependency bumps, tooling, build config |
| `ci` | CI pipeline changes |
| `build` | Build system, package scripts |
| `revert` | Revert a previous commit |

Examples:

```
feat(contacts): add bulk import via CSV

Adds POST /contacts/bulk-import accepting an uploaded CSV.
Rate-limited to 5 imports per workspace per hour.
Closes #142

---

fix(auth): reject magic-link tokens older than 15 minutes

Previously the expiry check was inclusive of the cutoff second,
allowing replays in the same wall-clock second.

---

chore(deps): bump prisma from 5.22.0 to 5.23.0
```

**Breaking changes** must include a `BREAKING CHANGE:` footer with migration
instructions. They also require a CHANGELOG entry under `Changed` and a
matching note in [`docs/upgrade-guide.md`](docs/upgrade-guide.md).

---

## Pull request workflow

1. **Open a draft PR early.** This signals scope to the team and unlocks CI on
   every push.
2. **Fill in the PR template.** What changed, why, screenshots/curl, risk,
   rollback plan, docs/CHANGELOG updated checklist.
3. **Keep PRs small.** Target ≤ 400 changed lines (excluding generated files).
   Larger PRs are reviewed last and rebased most often.
4. **Self-review the diff** before requesting reviews — it catches half the
   comments before they're written.
5. **Request review from a code owner** for the area you changed (see
   `.github/CODEOWNERS` once added). Two approvals required for changes to
   `apps/api/src/auth/**`, `apps/api/src/common/guards/**`,
   `packages/db/prisma/**`, and any billing module.
6. **Address every comment.** Reply, push a fix, or argue — silent dismissal
   is not acceptable.
7. **Squash on merge.** The PR title becomes the commit message; verify it
   matches Conventional Commit format.

---

## Required local checks

These run in CI and **must pass locally** before requesting review:

```bash
pnpm typecheck       # tsc --noEmit across all packages
pnpm lint            # ESLint + Prettier check
pnpm test            # Vitest unit suites
pnpm test:integration  # Testcontainers (requires Docker running)
```

For frontend changes also run:

```bash
pnpm --filter @wa-kijo/web build       # Next.js production build
pnpm --filter @wa-kijo/web test:e2e    # Playwright (auto-starts servers)
```

For schema changes:

```bash
pnpm db:migrate              # creates the migration locally
pnpm --filter @wa-kijo/db build
pnpm test:integration        # confirms tenant scoping still holds
```

Pre-commit hooks via `lint-staged` will format staged files and reject commits
that fail commitlint. Don't bypass with `--no-verify` unless you have a very
specific reason and document it in the PR.

---

## Coding standards

The full rulebook lives in `.claude/rules/`:

- [`backend.md`](.claude/rules/backend.md) — NestJS + Prisma module structure,
  DTO patterns, error handling, logging, performance defaults.
- [`frontend.md`](.claude/rules/frontend.md) — Next.js, server vs client
  components, TanStack Query, form patterns, RBAC UX hints.
- [`security.md`](.claude/rules/security.md) — auth, secrets, webhook
  signature verification, tenant isolation, input validation, PII rules.
- [`testing.md`](.claude/rules/testing.md) — runner choice, file location,
  coverage targets, fixture patterns.

If you find yourself fighting the rules, raise it in chat first. Don't merge
a deviation and wait for review to catch it.

---

## Documentation expectations

| Change | Required doc updates |
|---|---|
| New public endpoint | `docs/api/openapi.yaml`, Swagger decorators in the controller, [`docs/api-conventions.md`](docs/api-conventions.md) if a new pattern is introduced |
| New environment variable | [`.env.example`](.env.example) with comment, [`docs/runbook.md`](docs/runbook.md) env table, `packages/shared/src/env.schema.ts` |
| New permission | `packages/shared/src/auth/permissions.ts`, [`docs/architecture.md`](docs/architecture.md) RBAC section if the role model changes |
| New module | Module README inside `apps/api/src/modules/<feature>/README.md`, plus a section in `docs-site/concepts/` if customer-facing |
| Architectural decision | New ADR in `docs/decisions/NNNN-title.md` using the [`0000-template.md`](docs/decisions/0000-template.md) |
| Breaking change | `CHANGELOG.md` entry, [`docs/upgrade-guide.md`](docs/upgrade-guide.md) section, `BREAKING CHANGE:` commit footer |

---

## Adding a feature module — checklist

Use this as the PR description for any new feature module:

```
- [ ] Prisma model added to packages/db/prisma/schema.prisma
- [ ] Migration generated (pnpm db:migrate) with descriptive name
- [ ] Zod DTO in packages/shared/src/dto/<feature>.ts
- [ ] packages/shared rebuilt (pnpm --filter @wa-kijo/shared build)
- [ ] Module/controller/service/repository scaffolded under apps/api/src/modules/<feature>/
- [ ] Repository extends BaseRepository<T> with tenantWhere() implemented
- [ ] Permissions added to packages/shared/src/auth/permissions.ts
- [ ] @RequirePermission applied to every controller method
- [ ] Swagger decorators (@ApiTags, @ApiOperation, @ApiOkResponse, etc.)
- [ ] Unit tests covering happy path + permission denial
- [ ] Integration test for cross-tenant isolation
- [ ] Module imported in apps/api/src/app.module.ts
- [ ] docs/api/openapi.yaml regenerated
- [ ] CHANGELOG entry under Unreleased
```

The `nestjs-prisma` skill in Claude Code generates this scaffold end-to-end.
Use it.

---

## Releasing a version

1. Pick the version. wa'kijo follows [SemVer](https://semver.org/):
   - `MAJOR` for breaking changes (rare; coordinate with sales).
   - `MINOR` for new features.
   - `PATCH` for bug fixes only.
2. Move the `Unreleased` section in `CHANGELOG.md` under a new heading
   `## [X.Y.Z] - YYYY-MM-DD`.
3. Bump versions across packages:
   ```bash
   pnpm -r exec npm version <X.Y.Z>
   ```
4. Update [`docs/upgrade-guide.md`](docs/upgrade-guide.md) with any breaking
   changes or required steps.
5. Commit on `main`:
   ```
   chore(release): vX.Y.Z
   ```
6. Tag and push:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --tags
   ```
7. Trigger the release workflow (publishes the private GitHub release with
   the CHANGELOG section as the description).
8. Post in `#wa-kijo-releases` with the highlights and any required customer
   action.

---

## Questions?

- Day-to-day questions → `#wa-kijo-eng` Slack channel.
- Architecture / decision questions → open a draft ADR in `docs/decisions/`
  and request review.
- Customer-facing wording → loop in product before merging.

Welcome aboard.
