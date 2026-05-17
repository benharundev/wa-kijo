# Testing Rules

> **Scope:** Loaded when working on test files (`*.spec.ts`, `*.test.ts`,
> `e2e/**`, or anything under `apps/api/test/`).

## Test runners

- **Unit + integration:** Vitest
- **E2E:** Playwright

## File location convention

- Unit tests: next to the file under test (`foo.service.ts` →
  `foo.service.spec.ts`).
- Integration tests: `apps/api/test/integration/`
- E2E tests: `apps/api/test/e2e/` (uses Playwright; can hit the real API + DB).

## Coverage targets

- **Auth, billing, tenant isolation:** ≥80% line coverage. **Non-negotiable.**
- **Everything else:** ≥60% line coverage.

## Integration test patterns

Integration tests live in `apps/api/test/integration/` and run against a real
Postgres container. Use `pnpm test:integration` (serial — one container at a
time).

**Setup (`setup/testcontainers.ts`):** Launches `postgres:16-alpine` via
Testcontainers, runs `prisma migrate deploy`, returns `{ prisma, container }`.
Call `teardownTestDb(db)` in `afterAll`.

**Factories (`setup/test-factories.ts`):** Write directly via Prisma (bypass
Better Auth HTTP). Never import in production code.

- `createTestTenant(prisma, opts?)` — one call creates org + user + member,
  returns `{ org, user, member }`. Use this by default.
- `createTestOrg`, `createTestUser`, `createTestMember` — lower-level primitives
  for edge cases.

**`makeCtx` helper (copy into each spec file):**

```typescript
function makeCtx(userId: string, orgId: string): RequestContext {
  return {
    userId,
    orgId,
    orgType: 'WORKSPACE',
    userRole: 'admin',
    globalRole: 'user',
    requestId: 'test-request',
  };
}
```

## Tenant isolation tests

`apps/api/test/integration/tenant-isolation/cross-tenant.spec.ts` is the
canonical reference. **Every new repository** must assert that:

1. Cross-org `findById` returns `null` (not an error) — leakage check
2. `findAll` returns only own-org records
3. `update` and `delete` from a foreign org are silent no-ops, not throws

This is the most important test class in the codebase. See `security.md` for why
("the prime directive").

## Mock conventions

- **Do not mock the database in integration tests.** Hit real Postgres via
  Testcontainers. Mocks hide migration drift.
- **Do mock external HTTP** (Stripe, Resend, Meta WhatsApp API) at the SDK
  boundary. Use `vi.mock()` with a per-test factory.
- **Do not mock `BaseRepository`** — its tenant-scoping behavior is part of what
  the test is verifying. Build a real test tenant and exercise it.

## Fixture patterns

Prefer factory functions over JSON fixtures. The `createTest*` helpers in
`setup/test-factories.ts` cover the common cases. For unusual shapes, extend the
factory rather than checking in static JSON — schema changes will silently break
JSON fixtures.
