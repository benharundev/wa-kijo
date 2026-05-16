# Contributing to wa'kijo

Thanks for your interest. wa'kijo is Apache 2.0 licensed and welcomes
contributions from anyone. This document covers how the project is run, what
gets merged, and what's expected of contributors.

---

## TL;DR

- Open an issue or
  [discussion](https://github.com/benharundev/wa-kijo/discussions) before
  starting a non-trivial change so we can align on scope.
- Branch from `main`, name your branch `feat/<scope>` / `fix/<scope>` /
  `docs/<scope>`.
- Use Conventional Commits.
- Make sure `pnpm typecheck && pnpm test && pnpm lint` is green locally.
- Sign off your commits (`git commit -s`) — implicit DCO.
- Open a PR; we aim to first-respond within a few business days.

---

## Ground rules

- **Be kind.** Disagree with ideas, not people. See
  [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- **Discuss before you build.** Anything beyond bug fixes or small docs tweaks
  deserves a quick issue/discussion first. Saves you and us from building the
  wrong thing.
- **Tenant isolation is non-negotiable.** Any change touching a database query
  must preserve the `BaseRepository`-style tenant scoping. See
  [`.claude/rules/security.md`](.claude/rules/security.md).
- **Don't break the public envelope.** API response shape
  (`{ success, data, timestamp }`), authentication contract, and migration
  history are stable surfaces. Breaking them requires an ADR + an entry in
  `docs/upgrade-guide.md`.
- **Keep the opinionated stack opinionated.** Proposals to swap NestJS for
  Express, Prisma for Drizzle, etc. won't be accepted — those decisions are
  documented in the ADRs and are part of what makes wa'kijo wa'kijo.

---

## What kinds of contributions we want

| Always welcome             | Discuss first                                 | Probably not a fit                               |
| -------------------------- | --------------------------------------------- | ------------------------------------------------ |
| Bug fixes with a test      | New feature modules                           | Re-platforming (Express, Hono, Drizzle, MongoDB) |
| Doc clarifications + typos | Performance improvements that change behavior | Visual / drag-and-drop builders                  |
| Test coverage improvements | New ADRs for architectural decisions          | CMS or marketing-site features                   |
| Dependency security bumps  | New permissions                               |                                                  |
| Translation / i18n strings | New CLI scripts                               |                                                  |

---

## Local environment

Required versions:

| Tool    | Version             |
| ------- | ------------------- |
| Node.js | 22 LTS              |
| pnpm    | 9.x                 |
| Docker  | 25+ with Compose v2 |

Setup:

```bash
git clone https://github.com/benharundev/wa-kijo.git
cd wa-kijo
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

See [`docs/runbook.md`](docs/runbook.md) for the full day-to-day operations
reference.

---

## Branching model

Trunk-based development with short-lived feature branches.

```
main                ← always green, deployable, tagged for releases
└─ feat/<scope>     ← new functionality
└─ fix/<scope>      ← bug fixes
└─ chore/<scope>    ← deps, tooling, CI
└─ docs/<scope>     ← docs-only changes
└─ refactor/<scope> ← internal restructuring, no behavior change
└─ test/<scope>     ← tests only
```

- Branch names are kebab-case and prefixed with the change type.
- Rebase, do not merge. `git pull --rebase origin main` keeps history linear.
- No direct pushes to `main` — open a PR.

---

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
`commitlint` via Husky. Format:

```
<type>(<optional scope>): <imperative summary, ≤72 chars>

<optional body — wrap at 100 chars, explain *why*>

<optional footer — BREAKING CHANGE: ..., Closes #123>
```

Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`,
`build`, `revert`.

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
```

**Breaking changes** must include a `BREAKING CHANGE:` footer with migration
instructions, a `CHANGELOG.md` entry under `Changed`, and a section in
[`docs/upgrade-guide.md`](docs/upgrade-guide.md).

---

## DCO sign-off

We use the [Developer Certificate of Origin](https://developercertificate.org/)
instead of a CLA. By signing off your commits, you certify that you have the
right to submit the work under the project's license.

```bash
git commit -s -m "fix(auth): correct magic-link expiry boundary"
```

This adds a `Signed-off-by: Your Name <you@example.com>` line to the commit. We
don't merge PRs without it.

---

## Pull request workflow

1. **Open a draft PR early.** Signals scope to maintainers and lets CI run on
   every push.
2. **Fill in the PR template.** What changed, why, screenshots/curl if
   user-visible, risk, rollback plan, docs/CHANGELOG updated checklist.
3. **Keep PRs small.** Target ≤400 changed lines (excluding generated files).
   Larger PRs are slower to review and rebase more often.
4. **Self-review the diff** before requesting review — catches half the comments
   before they're written.
5. **Address every review comment.** Reply, push a fix, or push back with
   reasoning. Silent dismissal isn't acceptable.
6. **Squash on merge.** The PR title becomes the commit message; verify it
   matches Conventional Commit format.

Maintainer response targets:

- First response within 3 business days (Asia/Kuala Lumpur time).
- Critical security issues — same business day. See
  [`SECURITY.md`](SECURITY.md).
- We aren't a full-time OSS team. Patience and gentle nudges in the PR are
  welcome after a week of silence.

---

## Required local checks

These run in CI and must pass locally before requesting review:

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

Pre-commit hooks via `lint-staged` format staged files and reject commits that
fail commitlint. Don't bypass with `--no-verify` without a very specific reason
documented in the PR.

---

## Coding standards

The detailed rulebook lives in `.claude/rules/`:

- [`backend.md`](.claude/rules/backend.md) — NestJS + Prisma module structure,
  DTO patterns, error handling, logging, performance defaults.
- [`frontend.md`](.claude/rules/frontend.md) — Next.js, server vs client
  components, TanStack Query, form patterns, RBAC UX hints.
- [`security.md`](.claude/rules/security.md) — auth, secrets, webhook signature
  verification, tenant isolation, input validation, PII rules.
- [`testing.md`](.claude/rules/testing.md) — runner choice, file location,
  coverage targets, fixture patterns.

If you find yourself fighting the rules, raise it in the PR or open a
discussion. Don't merge a deviation and wait for review to catch it.

---

## Documentation expectations

| Change                   | Required doc updates                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| New public endpoint      | Swagger decorators in the controller, [`docs/api-conventions.md`](docs/api-conventions.md) if a new pattern is introduced   |
| New environment variable | [`.env.example`](.env.example) with comment, `packages/shared/src/env.schema.ts`, the env table in [`README.md`](README.md) |
| New permission           | `packages/shared/src/auth/permissions.ts`, [`docs-site/reference/permissions.mdx`](docs-site/reference/permissions.mdx)     |
| New module               | Section in `docs-site/concepts/` if customer-facing                                                                         |
| Architectural decision   | New ADR in `docs/decisions/NNNN-title.md` using the [`0000-template.md`](docs/decisions/0000-template.md)                   |
| Breaking change          | `CHANGELOG.md` entry, [`docs/upgrade-guide.md`](docs/upgrade-guide.md) section, `BREAKING CHANGE:` commit footer            |

---

## Adding a feature module — checklist

```
- [ ] Prisma model added to packages/db/prisma/schema.prisma
- [ ] Migration generated (pnpm db:migrate) with descriptive name
- [ ] Zod DTO in packages/shared/src/dto/<feature>.ts
- [ ] packages/shared rebuilt (pnpm --filter @wa-kijo/shared build)
- [ ] Module/controller/service/repository scaffolded under apps/api/src/modules/<feature>/
- [ ] Repository extends BaseRepository<T>
- [ ] Permissions added to packages/shared/src/auth/permissions.ts
- [ ] @RequirePermission applied to every controller method
- [ ] Swagger decorators (@ApiTags, @ApiOperation, @ApiOkResponse, etc.)
- [ ] Unit tests covering happy path + permission denial
- [ ] Integration test for cross-tenant isolation
- [ ] Module imported in apps/api/src/app.module.ts
- [ ] CHANGELOG entry under Unreleased
```

The `contacts` module is the canonical reference — copy its structure.

---

## Releasing a version (maintainers only)

1. Pick the version. [SemVer](https://semver.org/):
   - `MAJOR` for breaking changes (rare).
   - `MINOR` for new features.
   - `PATCH` for bug fixes only.
2. Move the `Unreleased` section in `CHANGELOG.md` under a new heading
   `## [X.Y.Z] - YYYY-MM-DD`.
3. Bump versions:
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
7. Draft a GitHub Release using the CHANGELOG section.

---

## Maintainer responsibilities

Maintainers are listed in [`.github/CODEOWNERS`](.github/CODEOWNERS) (when
added). Maintainers commit to:

- Triaging issues within 1 week (label + acknowledgment).
- First-responding to PRs within 3 business days.
- Communicating clearly when a contribution won't be merged and why.
- Keeping the public roadmap honest.

If you'd like to become a maintainer, get a few solid PRs merged first, then
open a discussion.

---

## Questions?

- Bugs and reproducible issues →
  [GitHub Issues](https://github.com/benharundev/wa-kijo/issues).
- Design / architecture questions →
  [GitHub Discussions](https://github.com/benharundev/wa-kijo/discussions).
- Security vulnerabilities → see [`SECURITY.md`](SECURITY.md). Do NOT file
  public issues for security problems.
- Commercial questions (Pro tier features, custom support) → see
  [`SUPPORT.md`](SUPPORT.md).

Welcome aboard.
