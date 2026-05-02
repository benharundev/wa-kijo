# ADR 0005 — BaseRepository<T> with automatic tenant scoping

**Date:** 2026-04-15
**Status:** Accepted
**Deciders:** wa-kijo core team

---

## Context

Multi-tenant data leaks are the most expensive bug class in B2B SaaS. A
single `prisma.contact.findUnique({ where: { id } })` call that forgets
to filter by `organizationId` returns *any* contact in the database,
including contacts belonging to other customers. The cost ranges from
embarrassment to GDPR / PDPA fines to losing the customer entirely.

We needed an architecture where:

- Tenant scoping is **the default**, not opt-in.
- Forgetting to scope is detectable in code review.
- Bypassing the scope is possible (admin tools, system jobs need it) but
  obvious in the diff.
- Soft delete and audit fields are handled the same way for every model
  without copy-pasted boilerplate.

LLMs writing code (Claude, Copilot) are particularly prone to omitting
the `organizationId` clause when generating queries — they pattern-match
on Prisma documentation, which doesn't enforce tenancy. The architecture
has to defend against that.

---

## Decision

**Every domain repository extends `BaseRepository<T>`. All persistence
goes through it.**

`BaseRepository<T>` is a generic class living at
`apps/api/src/base/base.repository.ts`. Subclasses provide:

- The Prisma model name (for type inference).
- A `tenantWhere(ctx: RequestContext)` method returning the per-tenant
  filter (`{ organizationId: ctx.orgId }` for most models).
- An `auditableFields()` method declaring which fields participate in
  the soft-delete + audit pattern.

The base class provides:

- `findAll(ctx, query)` — cursor-paginated, tenant-scoped, soft-delete-aware.
- `findById(ctx, id)` — returns null if the record exists in another
  tenant (deliberately indistinguishable from "doesn't exist").
- `create(ctx, data)` — populates `organizationId`, `createdBy`,
  `updatedBy`, `createdAt`, `updatedAt`.
- `update(ctx, id, data)` — bumps `updatedBy`, `updatedAt`. Refuses to
  update across tenants.
- `softDelete(ctx, id)` — sets `deletedAt`, `deletedBy`. Subsequent
  reads filter the row out by default.
- `transaction(ctx, fn)` — wraps a unit of work in a Prisma transaction,
  passing the same `RequestContext` through.

Direct calls to `prisma.<model>.*` outside `BaseRepository` are forbidden
unless the call site has an inline comment of the form:

```ts
// EXEMPT: cross-tenant admin query for migration. See <ticket>.
```

ESLint (Phase 5) will enforce this at build time.

---

## Alternatives considered

### Prisma middleware that injects `organizationId` globally

- One line of setup; works for every model automatically.
- **Why rejected:** Prisma middleware is being deprecated in favour of
  Client Extensions. More importantly, middleware operates *after*
  the query is constructed — it can filter, but it can't enforce that the
  *query author* thought about tenancy. A model with no
  `organizationId` field would silently skip the middleware and leak.

### Prisma Client Extensions

- Replaces middleware in newer Prisma versions. Cleaner API.
- **Why rejected:** Same issue — the extension can intercept
  `findMany` and inject `where.organizationId`, but it can't introspect
  raw SQL or `$queryRawUnsafe` calls. We still need a code-review-level
  pattern. Once the BaseRepository pattern is in place, an extension
  becomes redundant.

### Pass `orgId` as an explicit argument to every method

- Most explicit possible solution.
- **Why rejected:** Verbose. `prop drilling` `orgId` through every
  service / repository signature pollutes the codebase. Forgetting is
  still possible — the compiler doesn't enforce that the value passed
  is the *active* request's `orgId` and not some other one.

### Row-level security (RLS) at the Postgres layer

- The most defensible approach in principle — Postgres itself refuses
  cross-tenant reads.
- **Why rejected:** Prisma's RLS support is awkward (you have to set the
  session variable on every connection from the pool, which fights
  PgBouncer's transaction pooling). Complexity is high, debugging is
  harder. We may revisit this for the Enterprise tier where
  defence-in-depth justifies the cost. Until then, application-layer
  scoping is the pragmatic choice.

---

## Consequences

### Positive

- A new feature module **inherits tenant scoping for free** by extending
  `BaseRepository`. Onboarding cost is one method (`tenantWhere`).
- Reviewing a PR for tenant safety is easy: search for
  `prisma.<anything>.` outside of `BaseRepository` — there should be
  none, except for the explicitly-exempted system queries.
- Soft delete, audit fields, and cursor pagination come along for the
  ride. No copy-pasted boilerplate.
- `findById` returning `null` for out-of-tenant records (rather than
  throwing or returning 403) avoids leaking the existence of cross-tenant
  data. This matches the convention in `docs/api-conventions.md` § 8.

### Negative

- Junior contributors see `prisma.contact.findFirst(...)` in tutorials
  and don't immediately know that wa'kijo wraps it. We address this
  with `CLAUDE.md` and the `nestjs-prisma` skill.
- Generic types in TypeScript get hairy quickly. The current
  `BaseRepository<T extends { id: string; organizationId: string }>`
  signature is workable but not elegant. We accept the complexity
  budget here.
- Bypassing the scope (legitimate admin queries) requires the
  `// EXEMPT` comment. Some developers feel this is bureaucratic —
  it's deliberate. The friction is the point.

### Neutral

- We diverge from "vanilla NestJS + Prisma" tutorials. Customers used
  to hand-rolling repositories will need to adapt — documented.

---

## Implementation notes

The skeleton (full version in `apps/api/src/base/base.repository.ts`):

```ts
export abstract class BaseRepository<T extends { id: string }> {
  constructor(protected readonly prisma: PrismaService) {}

  protected abstract get model(): string;
  protected abstract tenantWhere(ctx: RequestContext): Record<string, unknown>;

  async findAll(ctx: RequestContext, query: ListQuery): Promise<Paginated<T>> {
    const where = {
      ...this.tenantWhere(ctx),
      deletedAt: null,
      ...query.filter,
    };
    const items = await (this.prisma as any)[this.model].findMany({
      where,
      take: query.limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: query.orderBy ?? { createdAt: 'desc' },
    });
    const hasMore = items.length > query.limit;
    if (hasMore) items.pop();
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null, hasMore };
  }

  // findById, create, update, softDelete follow the same pattern.
}
```

A typical subclass:

```ts
export class ContactsRepository extends BaseRepository<Contact> {
  protected get model() { return 'contact'; }
  protected tenantWhere(ctx: RequestContext) {
    return { organizationId: ctx.orgId };
  }
}
```

---

## References

- Prisma docs: https://www.prisma.io/docs
- Tenant isolation rule: `.claude/rules/security.md` § "Tenant isolation".
- Related ADRs: ADR-0001 (organisation hierarchy informs `tenantWhere`
  for hierarchy-aware queries).
