# API reference

This directory holds the **static OpenAPI snapshot** for the wa'kijo API. It is
regenerated on every release (and reviewed in PRs that add or change endpoints)
so customers, integrators, and the Mintlify docs site have a stable spec to
point at.

## Files

| File           | Purpose                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| `openapi.yaml` | OpenAPI 3.1 spec covering every wa'kijo endpoint outside of `/api/auth/*` |

## Live vs static

There are **two** OpenAPI surfaces in wa'kijo:

| Surface             | URL                                   | When to use                                                                                                           |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Live Swagger UI** | `http://localhost:3000/api/docs`      | Local development. Auto-generated from the running NestJS controllers — always up to date with what the binary serves |
| **Live JSON**       | `http://localhost:3000/api/docs/json` | Programmatic clients in dev (`pnpm dlx openapi-typescript-codegen`, etc.)                                             |
| **Static snapshot** | `docs/api/openapi.yaml`               | Customer documentation, version-controlled diffs, integrator handoff                                                  |

The snapshot is intentionally **not** generated at deploy time — that would let
CI silently regenerate it without anyone reviewing the diff. Instead, the dev
who adds an endpoint regenerates the snapshot and commits it as part of the same
PR. Reviewers see the API surface diff inline.

## Regenerating the snapshot

```bash
# 1. Start the API in dev mode
pnpm dev

# 2. In another terminal, dump the OpenAPI JSON and convert to YAML
pnpm api:openapi:dump
```

The script (`scripts/openapi-dump.ts`):

1. Fetches `http://localhost:3000/api/docs/json`.
2. Strips ephemeral fields (server URL, version timestamp).
3. Sorts keys deterministically (so diffs are minimal).
4. Writes `docs/api/openapi.yaml`.

Commit the result. CI will fail if your PR adds an endpoint without updating the
snapshot.

## What's in the snapshot

- Every controller mounted under `/api/v1/*`.
- The standard request/response schemas (Zod-derived via `nestjs-zod`'s
  `patchNestJsSwagger`).
- The cookie-auth security scheme.
- Standard error responses for 400 / 401 / 403 / 404 / 422 / 429 / 500.

## What's NOT in the snapshot

- `/api/auth/*` — handled by Better Auth outside the NestJS pipeline. Better
  Auth has its own OpenAPI spec generator in newer versions; we ship a
  placeholder stub for now (PRs to plumb it through welcome).
- `/admin/queues/*` — Bull-Board's HTML UI is not a JSON API.
- `/api/docs` and `/api/docs/json` themselves.
- The health endpoint at `/api/v1/health` — included but with a note that it
  bypasses the standard envelope.

## Validation

```bash
# Validate openapi.yaml
pnpm dlx @redocly/cli@latest lint docs/api/openapi.yaml

# Preview locally
pnpm dlx @redocly/cli@latest preview-docs docs/api/openapi.yaml
```

Both run in CI as part of the docs check.

## Versioning

The snapshot follows the wa'kijo release version. We do **not** bump the OpenAPI
`info.version` independently — keeping the two in sync makes it obvious which
release a snapshot belongs to.

When wa'kijo bumps to a new major (e.g. v2.0.0), we keep both `openapi.yaml`
(current major) and `openapi-v1.yaml` (previous major) for the duration of the
v1 deprecation window.
