# Module template

> **This is a template.** Don't edit it in place. Copy the whole folder when
> creating a new module:
>
> ```bash
> cp -R apps/api/src/modules/_template apps/api/src/modules/<your-module>
> # then sed -i '' 's/Template/<YourModule>/g' across the new folder
> # and rename module.manifest.ts entries to your slug
> ```

Use this as the canonical scaffold for any new business module. It matches:

- **ADR-0008** — every module declares a `module.manifest.ts`.
- **ADR-0009** — the `domain / application / infrastructure / presentation`
  four-layer split with strict dependency rules.
- **ADR-0010** — `domain/` may import `@wa-kijo/booking-core`.
- The mandatory test-first zones from `.claude/rules/testing.md` — every layer
  ships with the test files **already named** so it's obvious which tests are
  missing.

## Folder shape

```
_template/
├── module.manifest.ts                         # registry declaration
├── _template.module.ts                        # NestJS wiring (re-exported from presentation/)
├── domain/
│   ├── example.entity.ts                      # aggregate root with invariants
│   ├── example.entity.spec.ts                 # MANDATORY test-first
│   ├── value-objects/
│   │   └── example-status.vo.ts
│   ├── events/
│   │   └── example-created.event.ts
│   └── errors/
│       └── example-not-allowed.error.ts
├── application/
│   ├── commands/
│   │   ├── create-example.usecase.ts
│   │   └── create-example.usecase.spec.ts
│   ├── queries/
│   │   └── get-example.query.ts
│   ├── policies/
│   │   ├── example.policy.ts
│   │   └── example.policy.spec.ts             # MANDATORY test-first
│   └── hooks/
│       └── on-example-created.handler.ts
├── infrastructure/
│   ├── example.repository.ts                  # extends BaseRepository<T>
│   ├── example.repository.itest.ts            # cross-tenant isolation test (MANDATORY)
│   └── prisma-example.mapper.ts
└── presentation/
    ├── example.controller.ts
    ├── dto/
    │   └── README.md                          # re-exports from @wa-kijo/shared
    └── _template.module.ts
```

## What to delete from the template

After copying, remove these illustrative pieces if they don't apply:

- `value-objects/` — only if you actually need module-specific VOs.
- `events/` — only if your aggregate emits events.
- `policies/` — only if you have resource-level authorization beyond static RBAC
  (most modules eventually do).
- `hooks/` — only if your module subscribes to other modules' events.

The four layer folders themselves (`domain`, `application`, `infrastructure`,
`presentation`) **stay even if they're nearly empty**. Predictable navigation
matters more than minimum file count.

## Tests that ship with the template

The spec files in this template are deliberately **failing stubs** — they remind
you to write real assertions before the module ships. Replace `it.todo` with
real cases as you implement.

| Path                                          | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `domain/example.entity.spec.ts`               | Aggregate invariants — test-first               |
| `application/policies/example.policy.spec.ts` | Authorization decisions — test-first            |
| `application/commands/*.usecase.spec.ts`      | Use case orchestration — test-after acceptable  |
| `infrastructure/example.repository.itest.ts`  | Cross-tenant isolation — mandatory before merge |
