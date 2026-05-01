# Backend Rules — NestJS + Prisma

> **Scope:** Loaded when working on files under `apps/api/`, `packages/db/`, or
> `packages/shared/`. **Source of truth:** the `nestjs-prisma` skill. This file
> captures project-specific deviations and reminders.

## Module structure

Every feature module follows this skeleton:

```
apps/api/src/modules/<feature>/
├── <feature>.module.ts          # NestJS module wiring
├── <feature>.controller.ts      # HTTP endpoints, decorators, guards
├── <feature>.service.ts         # business logic
├── <feature>.repository.ts      # extends BaseRepository<T>
├── dto/
│   ├── create-<feature>.dto.ts  # Zod schema + class
│   └── update-<feature>.dto.ts
├── events/                       # domain events emitted (BullMQ)
└── <feature>.service.spec.ts    # unit tests
```

## BaseRepository pattern

- All persistence goes through `BaseRepository<T>`.
- Soft delete is built-in: `findMany` filters `deletedAt: null` by default. Pass
  `{ includeDeleted: true }` to override.
- Tenant scoping is built-in: every query is automatically filtered by the
  active tenant ID (workspaceId / orgId).
- `BaseRepository.transaction(fn)` wraps a unit of work in a Prisma transaction.

**Do NOT call `prisma.<model>.findMany` directly outside `BaseRepository`.** If
you must (for system-level queries), add an `// EXEMPT: <reason>` comment and a
unit test asserting tenant scoping.

## DTO validation

- DTOs are defined as **Zod schemas in `packages/shared/`**.
- Use `ZodValidationPipe` for incoming requests.
- Frontend reuses the same Zod schema. **Single source of truth.**

```ts
// packages/shared/src/dto/contact.ts
export const CreateContactSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/), // E.164
  name: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
});
export type CreateContactDto = z.infer<typeof CreateContactSchema>;
```

## API conventions

- Routes under `/api/v1/`. Versioning is at URL path level.
- Resource paths are plural (`/contacts`, `/conversations`).
- Use HTTP status codes correctly: 200, 201, 204, 400, 401, 403, 404, 409,
  422, 500.
- Pagination: cursor-based by default. Response shape:
  ```json
  { "data": [...], "nextCursor": "..." | null, "hasMore": boolean }
  ```
- Errors use a consistent shape via `HttpExceptionFilter`:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }
  ```

## RBAC

- Use `@RequirePermission('resource:action')` on controller methods.
- Permissions are checked server-side. Frontend `<Can />` is for UX only, not
  security.
- Workspace/org-scoped permissions are enforced by the tenant middleware
  automatically.

## Background jobs (BullMQ)

- Define queues in `apps/api/src/queues/`.
- Producer code emits a job; the consumer is a separate `Processor` class.
- All queues have:
  - Retry: 3 attempts with exponential backoff (1s, 5s, 30s).
  - Dead letter handling: failed jobs persist in DLQ for manual inspection.
- `Bull-Board` is exposed at `/admin/queues` (RBAC-gated to ADMIN+ only).

## Logging

- Use Pino (NestJS logger configured to use Pino).
- Log levels: `error` (alerts), `warn` (anomalies), `info` (significant events),
  `debug` (dev only).
- **Always include** request ID in logs. **Never include** PII, tokens,
  passwords, or full request bodies.
- Structured logs only. No string concatenation.

```ts
this.logger.info({ workspaceId, contactId }, 'Contact created'); // ✅
this.logger.info(`Created contact ${contactId} in ${workspaceId}`); // ❌
```

## Error handling

- Throw `BadRequestException`, `NotFoundException`, etc. from NestJS — let the
  global filter shape the response.
- Domain errors (e.g., `WorkspaceQuotaExceeded`) are typed exceptions in
  `apps/api/src/common/errors/`.
- Don't `try/catch` to swallow errors. Let them propagate; the filter logs and
  shapes.

## Testing

- Unit tests next to the file they test: `<file>.spec.ts`.
- Integration tests in `apps/api/test/integration/` (uses real Postgres via
  Testcontainers).
- E2E tests in `apps/api/test/e2e/` (Playwright).
- **Coverage targets:**
  - Auth, billing, tenant isolation: ≥80% line coverage.
  - Everything else: ≥60%.

## Performance defaults

- All list endpoints have `LIMIT` enforced by cursor pagination.
- Prisma `select` clauses are explicit on hot paths (don't over-fetch).
- Use `EXPLAIN ANALYZE` on any new query that touches a table > 100k rows.
- Connection pooling via PgBouncer in production. Prisma Accelerate optional.

## When in doubt

Check the `nestjs-prisma` skill first. This file only deviates where the project
requires.
