# Testing Rules

> **Scope:** Loaded when working on test files (`*.spec.ts`, `*.test.ts`,
> `e2e/**`). **Status:** Skeleton — to be filled in during Phase 2.

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

## To be added during Phase 2

- Testcontainers setup for integration tests with real Postgres
- Mock conventions
- Fixture patterns
- Cross-tenant isolation test helper (the most important test in this codebase)
