# Testing strategy

> **Audience:** wa'kijo developers writing tests, customers extending the test
> suite for their own modules.
>
> The shipped test pyramid favours **fast, parallel, isolated** unit tests for
> business logic, **realistic-but-controlled** integration tests for anything
> that touches the database or queues, and **end-to-end** browser tests for the
> user-visible flows that have to keep working through every refactor.

This document is the source of truth for test runners, file locations, naming,
fixtures, mocks, coverage targets, and CI gating. The terse internal rules in
[`.claude/rules/testing.md`](../.claude/rules/testing.md) are a quick-reference
subset of this file.

---

## 1. The pyramid

```
           ┌────────────────────────────┐
           │   E2E (Playwright)          │   ~ 20 specs
           │   apps/web/tests/e2e/       │   sign-in, settings, key flows
           └────────────────────────────┘
       ┌────────────────────────────────────┐
       │   Integration (Vitest + Testcontainers) │   ~ 100 specs
       │   apps/api/test/integration/       │   real Postgres, real Redis
       └────────────────────────────────────┘
   ┌────────────────────────────────────────────┐
   │   Unit (Vitest)                             │   target 1000+ specs
   │   apps/api/src/**/*.spec.ts                 │   pure logic, mocked deps
   │   packages/shared/src/**/*.spec.ts          │
   └────────────────────────────────────────────┘
```

Inversely-shaped pyramids (lots of E2E, few unit tests) are slow, flaky, and
painful to refactor. Resist them.

---

## 2. Runners and commands

| Suite       | Runner                                                | Command                                    |
| ----------- | ----------------------------------------------------- | ------------------------------------------ |
| Unit        | [Vitest](https://vitest.dev/)                         | `pnpm test`                                |
| Integration | Vitest + [Testcontainers](https://testcontainers.com) | `pnpm test:integration`                    |
| E2E         | [Playwright](https://playwright.dev/)                 | `pnpm test:e2e`                            |
| Coverage    | Vitest + V8                                           | `pnpm --filter @wa-kijo/api test:coverage` |

Run a single file:

```bash
pnpm --filter @wa-kijo/api test -- --run src/modules/contacts/contacts.service.spec.ts
pnpm --filter @wa-kijo/web test:e2e -- tests/e2e/sign-in.spec.ts
```

Watch mode (TDD):

```bash
pnpm --filter @wa-kijo/api test:watch
```

---

## 3. File location and naming

| Test type    | Location                               | Naming                |
| ------------ | -------------------------------------- | --------------------- |
| Unit         | Next to the file under test            | `<name>.spec.ts`      |
| Integration  | `apps/api/test/integration/<feature>/` | `<scenario>.itest.ts` |
| E2E          | `apps/web/tests/e2e/`                  | `<flow>.e2e.spec.ts`  |
| Fixtures     | `apps/api/test/fixtures/`              | `<entity>.fixture.ts` |
| Test helpers | `apps/api/test/utils/`                 | `<purpose>.ts`        |

The vitest config picks up `**/*.spec.ts` for unit and (separate config)
`**/*.itest.ts` for integration so the two suites can have different timeouts
and parallelism settings.

### Inside a single test file

Group tests by behaviour, not by method name:

```ts
describe('ContactsService', () => {
  describe('when creating a contact', () => {
    it('rejects duplicate phone numbers within the org', () => {
      /* ... */
    });
    it('accepts the same phone in a different org', () => {
      /* ... */
    });
    it('triggers a contact.created event', () => {
      /* ... */
    });
  });

  describe('when listing contacts', () => {
    it('returns a cursor-paginated page of 25 by default', () => {
      /* ... */
    });
    it('respects the limit query parameter, capped at 100', () => {
      /* ... */
    });
    it('filters out soft-deleted records', () => {
      /* ... */
    });
  });
});
```

Each `it` block tests **one behaviour**. If you find yourself writing "and" in
the description, split it.

---

## 4. Coverage targets

Enforced in CI via Vitest's `--coverage` flag with thresholds.

| Area                                           | Minimum line coverage                       |
| ---------------------------------------------- | ------------------------------------------- |
| `apps/api/src/auth/**`                         | **80%** — non-negotiable                    |
| `apps/api/src/modules/billing/**` (when added) | **80%** — non-negotiable                    |
| `apps/api/src/base/**` (BaseRepository)        | **80%** — non-negotiable                    |
| `apps/api/src/common/guards/**`                | **80%** — non-negotiable                    |
| Everything else in `apps/api`                  | 60%                                         |
| `packages/shared`                              | 75% (pure logic, easy to test)              |
| `apps/web`                                     | 50% line coverage; rely on E2E for the rest |

Coverage is a floor, not a ceiling. A high coverage number with low-value tests
is worse than a moderate number with sharp tests.

---

## 5. Unit tests

### What belongs in a unit test

- Pure business logic (validation, calculation, transformation).
- Permission checks, role inheritance, state transitions.
- Error message contents.

### What does NOT belong

- Anything that requires a real database — that's an integration test.
- Anything that hits the network — mock it or move it to integration.
- "Smoke tests" that just call a function and assert it didn't throw.

### Mocking

We use Vitest's built-in `vi.fn()` and `vi.mock()`. Avoid heavyweight mocking
libraries.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactsService } from './contacts.service';

describe('ContactsService', () => {
  let repo: {
    create: ReturnType<typeof vi.fn>;
    findByPhone: ReturnType<typeof vi.fn>;
  };
  let service: ContactsService;

  beforeEach(() => {
    repo = { create: vi.fn(), findByPhone: vi.fn() };
    service = new ContactsService(repo as never);
  });

  it('rejects duplicate phone numbers', async () => {
    repo.findByPhone.mockResolvedValue({ id: 'cmg1' });

    await expect(
      service.create(mockCtx(), { phone: '+60123456789', name: 'Aisha' }),
    ).rejects.toThrow('Contact with this phone already exists');

    expect(repo.create).not.toHaveBeenCalled();
  });
});
```

**Always assert the negative.** "Did we _not_ call the side effect we shouldn't
have?" catches more bugs than asserting only the happy path.

---

## 6. Integration tests

These are the tests we lean on hardest because they cover the seams that unit
tests can't see.

### Setup pattern

```ts
import { GenericContainer } from 'testcontainers';
import { PrismaClient } from '@wa-kijo/db';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let prisma: PrismaClient;
let container: any;

beforeAll(async () => {
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'test',
    })
    .withExposedPorts(5432)
    .start();

  process.env.DATABASE_URL = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/test`;

  prisma = new PrismaClient();
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
  // Apply migrations programmatically
  // (uses Prisma's deploy command via a child_process.spawn helper in test/utils/)
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});
```

A reusable `setupTestDatabase()` helper in `apps/api/test/utils/db.ts` bundles
the above. Use it.

### Tenant isolation tests — the most important class

For every repository, write a test that confirms cross-tenant access is
impossible:

```ts
describe('ContactsRepository — tenant isolation', () => {
  it('cannot read contacts from another organisation', async () => {
    const orgA = await orgFixture(prisma, { name: 'Acme A' });
    const orgB = await orgFixture(prisma, { name: 'Acme B' });

    const contact = await prisma.contact.create({
      data: { phone: '+60123456789', name: 'Aisha', organizationId: orgA.id },
    });

    const ctxB: RequestContext = { /* ... */, orgId: orgB.id };
    const result = await repo.findById(ctxB, contact.id);

    expect(result).toBeNull();
  });

  it('cannot update contacts from another organisation', async () => {
    // analogous
  });

  it('cannot soft-delete contacts from another organisation', async () => {
    // analogous
  });
});
```

These tests are the foundation of wa'kijo's tenant isolation guarantee. A new
module without them does not get merged.

### Performance: parallelism

Integration tests run **serially** within a file (one Postgres container per
file, recycled for each test). Across files they run in parallel, each with its
own container.

This is slower than fully-parallel unit tests but ~5× faster than a single
shared container with rollback per test. The trade-off is worth it.

---

## 7. End-to-end tests

Playwright auto-starts the API and web servers (see
`apps/web/playwright.config.ts`). To skip the auto-start (when servers are
already running):

```bash
WEB_SKIP_WEBSERVER=1 pnpm test:e2e
```

### What to test

The flows that _must_ keep working through every refactor:

- Sign-up → email verification → sign-in.
- Magic-link sign-in.
- Password reset.
- Create organisation → invite member → member accepts.
- Switch active organisation.
- Theme toggle (light / dark / system).
- 401 redirect from a protected page.

Coverage by area, not exhaustive scenarios. Don't use Playwright to test "every
input variant" — that's a unit test job.

### Selectors

Prefer `getByRole` and `getByLabel` over CSS selectors. They're stable across UI
refactors and double as accessibility audits.

```ts
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByLabel('Email').fill('member@example.com');
```

Avoid `data-testid` unless there's no accessible alternative.

---

## 8. Fixtures

A small set of factory functions in `apps/api/test/fixtures/`:

```ts
// apps/api/test/fixtures/org.fixture.ts
export async function orgFixture(
  prisma: PrismaClient,
  overrides: Partial<Organization> = {},
): Promise<Organization> {
  return prisma.organization.create({
    data: {
      name:
        overrides.name ?? `test-org-${Math.random().toString(36).slice(2, 8)}`,
      slug: overrides.slug ?? `test-${Math.random().toString(36).slice(2, 8)}`,
      orgType: overrides.orgType ?? 'WORKSPACE',
      parentOrgId: overrides.parentOrgId ?? null,
      ...overrides,
    },
  });
}
```

Rules for fixtures:

- One factory function per model.
- Always accept an `overrides` object.
- Generate unique fields (slug, email) by default to avoid collision in parallel
  tests.
- Never depend on other fixtures implicitly — pass parents in via overrides.

---

## 9. CI gating

A PR cannot merge unless:

1. `pnpm typecheck` passes.
2. `pnpm lint` passes.
3. `pnpm test` passes.
4. `pnpm test:integration` passes.
5. `pnpm test:e2e` passes.
6. Coverage thresholds (§ 4) hold.
7. At least one code-owner approval (two for auth/billing/schema).

Tests that are temporarily broken **must be skipped explicitly** with
`it.skip(..., 'TODO: re-enable after #142')`. Silent disabling via comment is
forbidden.

---

## 10. Common pitfalls

| Pitfall                                             | How to spot it                                  | Fix                                                        |
| --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Test depends on wall-clock time                     | Flakes around midnight UTC, near DST boundaries | Inject `Date.now`, use `vi.useFakeTimers()`                |
| Test depends on test execution order                | Passes alone, fails in suite                    | Reset state in `beforeEach`; never share mutable globals   |
| Database state leaks between tests                  | Counts grow over a test run                     | Use a unique org per test; let soft delete clean up        |
| Network call to a real service                      | Slow; flakes under wifi                         | Mock at the SDK boundary (e.g. `vi.mock('resend')`)        |
| `expect(...).toBe(undefined)` after an async typo   | Test passes silently                            | Always `await` async assertions; ESLint rule enforces this |
| E2E test asserts after a navigation without waiting | Flakes locally fine, fails in CI                | `await expect(page).toHaveURL(...)` before next assertion  |

---

## 11. Adding tests for a new module — checklist

Mirror this in your PR:

```
- [ ] Service unit tests cover happy path, validation, permission denial,
      and at least one failure mode per public method
- [ ] Repository integration test asserts cross-tenant isolation
- [ ] Controller integration test asserts the response envelope shape
      (success and error)
- [ ] If the module emits events, a processor unit test asserts the
      event is published exactly once per trigger
- [ ] Coverage threshold met (60% baseline; 80% if the module touches
      auth, billing, or tenant scoping)
```

---

## 12. Further reading

- [`backend.md`](../.claude/rules/backend.md) — backend rules for what goes in
  services vs repositories.
- [`security.md`](../.claude/rules/security.md) — security checklist every test
  should reinforce, especially tenant isolation.
- The `nestjs-prisma` skill — generates a module scaffold including all the test
  files above, pre-wired.
