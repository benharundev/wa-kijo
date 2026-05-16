# ADR 0004 — Zod as the single source of truth for types

**Date:** 2026-04-15 **Status:** Accepted **Deciders:** wa-kijo core team

---

## Context

Multi-tenant B2B SaaS lives or dies by data validation. Bad input that slips
past the API layer corrupts a tenant's data; bad input that slips past the form
layer frustrates the user. Worse, when the API and the frontend disagree on what
a "Contact" looks like, every shipped feature gains a dozen edge cases nobody
tested.

We had three sources of typed data shapes:

1. The Prisma schema (database).
2. NestJS DTO classes with `class-validator` (API).
3. React Hook Form types (frontend).

In our prior projects, these three drifted constantly. A new optional field
added to the API DTO would mysteriously break the form because the frontend type
was hand-maintained. Validation logic was duplicated across the form
(`react-hook-form` resolvers), the API (`class-validator` decorators), and
frequently a third time in service code as a defensive check.

---

## Decision

**We use Zod schemas defined in `packages/shared/src/dto/` as the single source
of truth for every cross-boundary data shape.**

- API controllers use `nestjs-zod`'s `ZodValidationPipe` with the shared schema
  for body, query, and param validation.
- API services and repositories type their parameters with
  `z.infer<typeof Schema>`.
- Frontend forms use `@hookform/resolvers/zod` with the same shared schema.
- Frontend API client wrappers use the schema to type response payloads.
- The environment variable schema (`packages/shared/src/env.schema.ts`)
  validates `process.env` at boot via `EnvService`.

The Prisma schema remains the source of truth for **persistence**, but its
generated types are consumed only inside repositories. Public boundaries always
go through Zod.

---

## Alternatives considered

### `class-validator` + `class-transformer` (NestJS default)

- Decorators on DTO classes; familiar to NestJS developers.
- **Why rejected:** Decorator metadata isn't a real type — `class-validator`
  enforces it at runtime but doesn't produce a TypeScript-precise type for
  `z.infer`-style consumption. Sharing the class with the frontend means
  shipping `reflect-metadata` to the browser, which we won't do.

### `io-ts` / `effect/Schema`

- Strong type system, especially `effect/Schema`'s decoder/encoder split.
- **Why rejected:** Steeper learning curve than Zod. Smaller community means
  fewer Stack Overflow answers for buyers debugging at 2 a.m. The ergonomic gap
  with Zod isn't large enough to justify the cost.

### Hand-written types + runtime validation in two places

- Theoretical maximum control.
- **Why rejected:** This is the status quo we're escaping. Drift is guaranteed.

### TypeBox or JSON Schema as the canonical format

- JSON Schema is a serialisable artefact; could feed straight into Swagger /
  OpenAPI.
- **Why rejected:** TypeBox's TypeScript ergonomics are weaker than Zod's. We
  can derive OpenAPI from Zod via `nestjs-zod`'s patched Swagger generator,
  which gives us the same downstream output without the upstream pain.

---

## Consequences

### Positive

- One place to look for "what does this DTO look like?" — the file in
  `packages/shared/src/dto/`.
- Adding a field is a 1-line change visible to both API and frontend.
- Type inference everywhere —
  `CreateContactDto = z.infer<typeof CreateContactSchema>` means TS catches any
  mismatch automatically.
- Zod's runtime validation messages are good enough to drop straight into the
  API error envelope. We use them as-is.

### Negative

- The shared package must be **rebuilt** after editing a schema before the
  running API picks it up — `pnpm --filter @wa-kijo/shared build`. `pnpm dev`
  handles this on first start; ad-hoc edits during a dev session don't, which
  has surprised contributors. Documented in `CLAUDE.md`.
- `nestjs-zod`'s Swagger integration requires `patchNestJsSwagger()` at
  bootstrap. One-line cost, but it's a non-obvious requirement.
- Recursive Zod schemas (e.g. tree-shaped DTOs) can't be inferred without an
  explicit type alias. Rare; documented at the rare site.

### Neutral

- The Prisma type for a model is **not** the same as the API DTO — the DTO is a
  deliberately curated subset/superset. Some developers expect them to be one
  and the same; they are not. Documented in `docs/architecture.md`.

---

## Implementation notes

A canonical example:

```ts
// packages/shared/src/dto/contact.ts
import { z } from 'zod';

export const CreateContactSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/), // E.164
  name: z.string().min(1).max(100),
  tagIds: z.array(z.string().cuid()).default([]),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateContactDto = z.infer<typeof CreateContactSchema>;
```

```ts
// apps/api/src/modules/contacts/contacts.controller.ts
@Post()
create(
  @CurrentUser() ctx: RequestContext,
  @Body(new ZodValidationPipe(CreateContactSchema)) dto: CreateContactDto,
) {
  return this.contacts.create(ctx, dto);
}
```

```ts
// apps/web/src/app/(app)/contacts/new/page.tsx
const form = useForm<CreateContactDto>({
  resolver: zodResolver(CreateContactSchema),
});
```

The schema is the contract. Everything else conforms to it.

---

## References

- Zod: https://zod.dev/
- nestjs-zod: https://github.com/risenforces/nestjs-zod
- Related ADRs: none yet.
