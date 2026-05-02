# ADR 0006 — Mintlify for customer-facing documentation

**Date:** 2026-05-02
**Status:** Accepted
**Deciders:** wa-kijo core team

---

## Context

wa'kijo is a sellable product — customers buy a private GitHub repo plus
**docs**. The internal `docs/` directory (architecture, runbook, ADRs,
PRD) is written for engineers who already have the repo open. Customers
also need a **handbook**: hosted, searchable, beautifully rendered, with
working code examples and cross-references.

Specifically the handbook needs:

- Versioned content tied to release tags.
- Server-side rendered, fast-loading pages — first impression for
  prospects evaluating the product.
- A search box that works on the first keystroke.
- Code blocks with syntax highlighting and copy buttons.
- API reference rendered from OpenAPI.
- Custom theming so it feels like a wa'kijo product, not a generic
  template.
- An OK story for buyers who want to fork and self-host the docs at
  their own brand domain after they buy.

We host the docs ourselves at `docs.wakijo.dev` (Phase 8) and ship the
source under `docs-site/` so buyers can preview locally and fork as they
prefer.

---

## Decision

**We use [Mintlify](https://mintlify.com) for the customer-facing
documentation site.**

The source lives at `docs-site/` in the repo root and follows Mintlify's
expected structure:

- `docs.json` at the root (Mintlify v2 config).
- `.mdx` page files organised under `concepts/`, `guides/`, `reference/`,
  and root-level pages (`introduction.mdx`, `quickstart.mdx`,
  `troubleshooting.mdx`, `support.mdx`, `changelog.mdx`).
- `openapi.yaml` referenced from `docs.json` for the auto-rendered API
  reference.

We host the production site at `docs.wakijo.dev` via Mintlify's hosted
service. Customers who want to self-host can run Mintlify locally
(`mintlify dev`) or export to a static site.

---

## Alternatives considered

### Docusaurus

- Open-source, extremely popular in OSS land.
- **Why rejected:** Aesthetically generic without significant theming
  work. We'd spend weeks customising the React theme to feel premium.
  Search requires Algolia setup. Versioning works but is awkward to
  maintain through a release cycle.

### Nextra

- Built on Next.js, would let us reuse the team's React knowledge.
- **Why rejected:** Less polished out of the box than Mintlify. We'd be
  building the docs framework as well as the docs.

### Mkdocs Material

- Excellent typography, fast, Python-based.
- **Why rejected:** Adds Python to the stack just for docs. Two
  toolchains to maintain. Search and dark mode are good but the visual
  default doesn't match the wa'kijo product feel.

### Just markdown in the repo

- Zero infrastructure.
- **Why rejected:** Customers expect a hosted, searchable handbook with
  navigation. GitHub markdown rendering doesn't do code-block tabs,
  callouts, or runnable snippets — patterns we lean on heavily.

### Notion / GitBook / a hosted SaaS

- Beautiful out of the box. Often recommended.
- **Why rejected:** Source of truth lives outside the repo, which means
  it can't be reviewed in PRs. Drift between docs and code becomes
  inevitable. We've been burned by this before.

---

## Consequences

### Positive

- Source of truth stays in the repo: `docs-site/` is reviewed in PRs,
  versioned with releases, and forkable by buyers.
- Mintlify renders OpenAPI reference automatically from
  `docs/api/openapi.yaml`.
- First-class support for code blocks, callouts, accordions, tabs,
  cards — all of which we use for "how do I..." guides.
- Built-in search (Mintlify-hosted) — no separate Algolia account.
- Dark mode, light mode, sidebar navigation, breadcrumbs — all out of
  the box. Days of theme work avoided.

### Negative

- Hosted Mintlify is a paid product. We absorb the cost as a vendor;
  customers self-hosting are on their own (or use the open-source
  preview which is free).
- Mintlify's `docs.json` schema occasionally changes with new versions.
  We pin the recommended version in the file's header and document the
  upgrade in [`upgrade-guide.md`](../upgrade-guide.md).
- Mintlify rendering is opinionated — long-form MDX with custom React
  components is awkward. We accept that some advanced layouts (e.g.
  interactive demos) live as separate routes on `wakijo.dev`.

### Neutral

- The docs site is a separate deployment from the API and web app, which
  is a feature (independent release cadence) but adds one more thing to
  monitor.

---

## Implementation notes

- `docs-site/docs.json` defines navigation, theme, top-level metadata,
  and the OpenAPI source path.
- Pages live as `.mdx` files. Markdown + JSX components.
- The Mintlify CLI (`pnpm dlx mintlify dev`) serves a local preview at
  `localhost:3000` (note: collides with the API; we run on a non-default
  port via `mintlify dev --port 3010`).
- The API reference is generated from `docs/api/openapi.yaml`. Whenever
  a new endpoint ships, regenerate via `pnpm api:openapi:dump` (Phase 5)
  and review the diff before committing.

The `docs-site/` directory is intended to be **mostly self-contained** —
buyers who want to host their own forked version of the docs do not need
to bring along the rest of the wa'kijo monorepo.

---

## References

- Mintlify: https://mintlify.com
- Mintlify configuration: https://mintlify.com/docs/settings
- Related ADRs: none directly. PRD § 2 (target customer) drove the
  "premium feel" requirement.
