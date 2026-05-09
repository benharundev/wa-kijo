# `@wa-kijo/booking-core`

Shared domain kernel for scheduling and booking. Persistence-agnostic,
framework-agnostic. Consumed by every wa'kijo business module that schedules
anything (wa'lawe tournament rounds, Workshop appointments, future property
rentals, marketplace bookings).

> See [ADR-0010](../../docs/decisions/0010-booking-core-kernel.md) for the full
> rationale, the dual-consumer rule, and what's deliberately kept _out_ of this
> package.

## Layer rules

This package is the strictest layer in the codebase:

- **`domain/`** — pure TypeScript. No NestJS, no Prisma, no BullMQ, no HTTP
  clients, no I/O of any kind.
- **`application/ports/`** — interfaces only. Consumers implement these in their
  own `infrastructure/`.
- **No `infrastructure/`. No `presentation/`.** Those belong to consuming
  modules.

If you find yourself wanting to import `@nestjs/*`, `@prisma/client`, or
`bullmq` here, the abstraction belongs in a consumer module instead.

## What's inside

```
src/
├── domain/
│   ├── time-range.vo.ts                  # value object
│   ├── booking-state.ts                  # state enum + transition table
│   ├── resource.interface.ts             # what a schedulable resource looks like
│   ├── schedulable.interface.ts          # what a bookable thing looks like
│   ├── availability-rule.ts              # working hours, blackouts
│   ├── services/
│   │   ├── conflict-detection.service.ts # overlap rules
│   │   └── availability-check.service.ts # is-this-slot-free
│   ├── events/                           # 5 lifecycle events with Zod schemas
│   └── errors/                           # ConflictError, OutsideAvailabilityError
└── application/
    └── ports/
        ├── schedulable-repository.port.ts
        └── domain-event-publisher.port.ts
```

## Adding to the kernel

Rule from ADR-0010: **at least two real consumer modules must need it** before
an abstraction graduates from a single module into the kernel. Single-consumer
abstractions live in that consumer's module.

When adding:

1. Write the test cases first (this package is mandatory test-first).
2. Implement in `domain/` or `application/ports/`.
3. Re-export from `src/index.ts`.
4. Bump the package version (SemVer — kernel changes have wide blast radius).

## Build & test

```bash
# Build the CJS dist/ that consumers resolve at runtime
pnpm --filter @wa-kijo/booking-core build

# Run the test suite (sub-second; pure unit tests)
pnpm --filter @wa-kijo/booking-core test

# Watch mode for TDD on invariants
pnpm --filter @wa-kijo/booking-core test:watch
```

The 90% line / 85% branch coverage thresholds are enforced in
`vitest.config.ts`. The kernel is small and pure — these targets are achievable
and non-negotiable.

## Versioning

Independent SemVer, decoupled from the wa-kijo platform version. A breaking
kernel change is a major bump and forces every consumer module to declare a
compatible range in its `module.manifest.ts`.
