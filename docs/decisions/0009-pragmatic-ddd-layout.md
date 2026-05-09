# ADR 0009 — Pragmatic DDD layout for module bounded contexts

**Date:** 2026-05-10 **Status:** Accepted **Deciders:** wa-kijo core team

> Establishes the per-module folder structure, when to introduce aggregates /
> value objects / domain events, and the ground rules that stop "DDD theatre"
> from creeping in. Read alongside ADR-0008 (Module Registry — _what_ a module
> is) and ADR-0010 (Booking Core — the shared kernel).

---

## Context

ADR-0008 turns each business domain into a **bounded context** (a "module" in
our vocabulary). Modules range from very simple (`contacts` is essentially CRUD)
to very complex (the Booking Core kernel and its consumers — wa'lawe tournament
logic, Workshop scheduling, future property rentals — have real invariants,
multi-step workflows, and events).

A flat `service / repository / controller` shape served Phases 1–5 well. It will
buckle under the new modules:

- **Booking Core consumers** need invariants enforced ("a confirmed pairing
  cannot overlap another confirmed pairing on the same resource") that don't
  have a good home in a NestJS service.
- **Domain events** that ride the BullMQ events queue need a stable shape, owned
  by the module that emits them — not buried in a `.service.ts` next to ORM
  calls.
- **Hook handlers and policy classes** read more clearly when they sit next to
  the domain types they discriminate on, rather than in a cross-cutting
  `common/` directory.

We need a folder structure that **scales up** for complex modules without
**imposing ceremony** on simple ones. We also need the rules written down so
contributors don't accumulate folders named `aggregates/` containing 4-line
classes that wrap a Prisma row — the canonical DDD failure mode in projects that
adopted the vocabulary without the value.

---

## Decision

**Every business module follows a four-layer folder structure. Layers are named
the same in every module so navigation is predictable. Whether a layer is
non-trivial or essentially empty depends on the module's complexity — that's a
feature, not a smell.**

```
apps/api/src/modules/<module>/
├── module.manifest.ts                    # ADR-0008 declaration
├── domain/
│   ├── <aggregate>.entity.ts             # only when invariants exist
│   ├── <value-object>.vo.ts              # only when worth modelling
│   ├── <domain-service>.service.ts       # pure logic, no I/O
│   ├── events/
│   │   └── <name>.event.ts               # one file per domain event
│   └── errors/
│       └── <name>.error.ts               # typed domain errors
├── application/
│   ├── commands/
│   │   └── <verb>-<noun>.usecase.ts      # one file per write use case
│   ├── queries/
│   │   └── <noun>.query.ts               # one file per read use case
│   ├── policies/
│   │   └── <name>.policy.ts              # runtime authorization
│   └── hooks/
│       └── <hook-point>.handler.ts       # subscribers to other modules' hooks
├── infrastructure/
│   ├── <module>.repository.ts            # extends BaseRepository<T>
│   ├── <provider>.adapter.ts             # external SDK wrappers
│   └── prisma-<aggregate>.mapper.ts      # PrismaRow ↔ Domain entity
└── presentation/
    ├── <module>.controller.ts            # HTTP routes, guards, Swagger
    ├── dto/
    │   └── ...                            # re-exports from @wa-kijo/shared
    └── <module>.module.ts                 # NestJS module wiring
```

**Layer responsibilities and what crosses each boundary:**

| Layer             | May import                                                                             | May NOT import                                   |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `domain/`         | Other domain files in the same module; `@wa-kijo/booking-core/domain` for kernel use   | NestJS, Prisma, fastify, BullMQ, anything I/O    |
| `application/`    | `domain/`, `infrastructure/` interfaces (not concrete classes), `@wa-kijo/shared` DTOs | `presentation/`, raw Prisma, `request` / `reply` |
| `infrastructure/` | Prisma, BullMQ, external SDKs, `domain/` (to map to entities)                          | `presentation/`, `application/` use cases        |
| `presentation/`   | Anything                                                                               | —                                                |

The dependency rule is **inward-only**: outer layers depend on inner layers,
never the reverse. If `domain/` ends up importing from `infrastructure/`, the
design is wrong.

### When to introduce each tactical pattern

| Pattern                                                                                | Use when                                                                                                                                                     | Skip when                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Entity** (TypeScript class with identity)                                            | The thing has identity that survives state changes (a `Booking`, a `Tournament`, a `User`)                                                                   | The thing is just a row of data with no behaviour (a `Tag`, a `Country`) |
| **Aggregate root** (entity that owns sub-entities and enforces invariants across them) | There are invariants spanning multiple objects ("rounds in a tournament must be sequentially numbered"; "a booking's slot must not overlap an existing one") | A simple parent-child relation with no cross-row rules                   |
| **Value object** (immutable, equality by value)                                        | The concept appears in multiple places and must validate (`Phone`, `TimeRange`, `MoneyAmount`, `Slug`)                                                       | A throwaway combination used in one method                               |
| **Domain service** (function/class with no entity-state)                               | Logic involves multiple aggregates or doesn't naturally belong to any one (`ConflictDetectionService`, `PairingAlgorithm`)                                   | Logic that's just an entity method                                       |
| **Domain event** (fact that something happened)                                        | Other parts of the system care; cross-bounded-context communication                                                                                          | An internal step within one use case                                     |
| **Repository**                                                                         | Always — `BaseRepository<T>` is mandatory per ADR-0005                                                                                                       | —                                                                        |
| **Mapper** (PrismaRow ↔ Entity)                                                        | The domain entity is a class with methods, not a plain Prisma type                                                                                           | The "entity" is just the Prisma row's type — fine for simple modules     |

### What we **explicitly do not adopt**

- **CQRS with separate read/write databases.** Use cases are split into
  `commands/` and `queries/` for code organisation only. Both read from and
  write to the same Postgres. We may revisit at scale; not before.
- **Event sourcing.** Domain events go on the BullMQ events queue and are
  recorded in `AuditLog` where they're auditable. The current state remains in
  normalised Postgres tables. No event store, no projections.
- **Anemic-vs-rich domain model dogma.** Some domain types are classes with
  behaviour. Others are typed Prisma rows that pass through a service. Both are
  fine. Choose based on whether there are invariants worth enforcing in one
  place.
- **Repository interfaces (`IBookingRepository`) for the sake of "depending on
  abstractions".** The concrete `BookingRepository` is the abstraction. Test
  substitution uses Vitest's `vi.fn()`, not hand-written interface
  implementations.
- **Application Services as a separate layer between use cases and
  controllers.** A use case (e.g. `RequestBookingUseCase`) _is_ the application
  service. Don't wrap it.

### Domain events — the canonical shape

```ts
// apps/api/src/modules/tournament/domain/events/round-paired.event.ts
import { z } from 'zod';

export const RoundPairedEvent = {
  name: 'tournament.round.paired' as const,
  schema: z.object({
    tournamentId: z.string().cuid(),
    roundNumber: z.number().int().positive(),
    pairings: z.array(
      z.object({
        boardNumber: z.number().int().positive(),
        whitePlayerId: z.string().cuid(),
        blackPlayerId: z.string().cuid().nullable(), // null on bye
      }),
    ),
    pairedAt: z.coerce.date(),
  }),
} as const;

export type RoundPairedPayload = z.infer<typeof RoundPairedEvent.schema>;
```

Events are **objects with a `name` and a Zod `schema`**, not classes. They cross
module boundaries via BullMQ; the consumer validates the payload with the schema
before processing. Versioning rules:

- **Add an optional field** = minor bump.
- **Add a required field, rename, or remove a field** = major bump. Old
  subscribers must be updated.
- **Event renames** are forbidden. If the meaning changes, ship a new event.

### Use cases — the canonical shape

```ts
// apps/api/src/modules/tournament/application/commands/pair-next-round.usecase.ts
@Injectable()
export class PairNextRoundUseCase {
  constructor(
    private readonly tournaments: TournamentsRepository, // infra
    private readonly pairer: SwissPairingService, // domain
    private readonly events: EventBus, // infra interface
  ) {}

  async execute(ctx: RequestContext, dto: PairNextRoundDto): Promise<RoundDto> {
    const tournament = await this.tournaments.findById(ctx, dto.tournamentId);
    if (!tournament) throw new NotFoundException();

    const round = tournament.startNextRound(dto.now); // domain method
    const pairings = this.pairer.pair(tournament.standings, round.number);

    round.assignPairings(pairings); // invariants enforced inside
    await this.tournaments.save(ctx, tournament);

    await this.events.publish(RoundPairedEvent, {
      tournamentId: tournament.id,
      roundNumber: round.number,
      pairings: pairings.map(toEventShape),
      pairedAt: round.startedAt,
    });

    return RoundMapper.toDto(round);
  }
}
```

Notes:

- The use case depends on a **domain service** (`SwissPairingService`) for pure
  logic and a **repository** for persistence. It contains the glue but no
  business rules.
- The aggregate (`Tournament`) holds invariants in methods like `startNextRound`
  and `assignPairings` — those throw `DomainError` subclasses if invariants are
  violated.
- The event is published **after** the save, on the same BullMQ transaction
  commit boundary so we can't get the event without the state change. (This is
  the simplest delivery semantic; the outbox pattern is a Phase 7+
  optimisation.)

---

## Alternatives considered

### Hexagonal / Ports & Adapters everywhere

- Strict: every external dependency goes through a port interface, with adapter
  implementations.
- **Why rejected for general use:** Overhead with no payoff for simple modules.
  We adopt it inside `@wa-kijo/booking-core` (where the kernel must be
  persistence-agnostic) and skip it for modules that are essentially
  Prisma-backed.

### Clean Architecture (Robert C. Martin) verbatim

- 4 layers (Entities / Use Cases / Interface Adapters / Frameworks).
- **Why rejected:** Same family as our chosen approach but with vocabulary
  that's harder to map to NestJS. Our four layer names
  (`domain / application / infrastructure / presentation`) match the NestJS /
  DDD literature most contributors will have read.

### Vertical slice architecture

- Folders by feature (`create-booking/`) with all layers inside.
- **Why rejected:** Beautiful for a single bounded context with many features.
  Awkward across modules — where does the kernel go? Where does a hook handler
  that spans modules live? We keep slices inside layers (one file per use case,
  named by verb) but anchor on the layer-first structure.

### "Just keep using `service / repository / controller` as before"

- Familiar; works fine for simple CRUD.
- **Why rejected:** Doesn't scale to the Booking Core consumers. We could keep
  it for `contacts` and adopt the new shape only for new complex modules — but
  **inconsistency is its own cost**, and most contributors will copy whichever
  shape they see first. Better to pick one and use it everywhere, accepting that
  simple modules have near-empty `domain/` directories.

---

## Consequences

### Positive

- **Predictable navigation.** Open any module and the four layers are in the
  same place. Domain logic lives in one folder; Prisma calls live in another.
- **Test surface is obvious.** `domain/*.spec.ts` is fast unit tests of pure
  logic. `application/*.spec.ts` mocks the infra layer.
  `infrastructure/*.itest.ts` is integration. `presentation/*.e2e.ts` is E2E.
  The pyramid in `docs/testing.md` maps 1:1 onto folders.
- **Hooks and policies have a home.** `application/hooks/` and
  `application/policies/` are first-class layers, not corners of `common/`.
- **Dependency rule prevents coupling regressions.** A linter check (Phase 6c)
  enforces "no `domain/` file imports `@nestjs/*` or `@prisma/client`".

### Negative

- **More folders for simple modules.** `contacts` ends up with an almost-empty
  `domain/` and a `domain/events/` with one or two events. Acceptable cost for
  navigational consistency.
- **Mappers add code.** Every aggregate that's a class (not a typed row) needs a
  `PrismaXxxMapper` to translate to/from the Prisma row. Worth it when the
  aggregate has methods; skip when it doesn't.
- **Contributors familiar with vanilla NestJS need to learn the shape.**
  Documented in `CLAUDE.md` and `.claude/rules/backend.md`.

### Neutral

- The boundary between "this is a domain service" and "this is an application
  use case" requires judgement. Stated rule: domain services don't know about
  `RequestContext`; use cases do. If a service touches `ctx.orgId`, it lives in
  `application/`.

---

## Test discipline (test-supported with mandatory test-first zones)

Per the user's preference and the existing rules in
[`docs/testing.md`](../testing.md), we operate **test-supported, not strict
TDD**. The following zones are **mandatory test-first**:

| Zone                                             | Why test-first                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `domain/<aggregate>.entity.ts` invariant methods | Invariants are the contract. Easier to enumerate cases first      |
| `domain/events/*.event.ts` schemas               | Events are inter-module API. Schema tests prevent silent breakage |
| `application/policies/*.policy.ts`               | Authorization decisions are the most-tested code in the system    |
| `application/hooks/*.handler.ts` contracts       | Hook signatures are public API per ADR-0008                       |
| Prisma migration scripts inside a module         | Migrations against fixture databases of v(N-1)                    |
| Cross-tenant scoping tests                       | Already mandatory per ADR-0005                                    |

Test-after is fine for: NestJS module wiring, simple CRUD use cases, DTO
re-exports, mappers (inferred from types), Swagger decoration.

### Coverage targets per layer

| Layer             | Coverage target | Test type                    |
| ----------------- | --------------- | ---------------------------- |
| `domain/`         | **90%** line    | Unit (Vitest, no I/O)        |
| `application/`    | **80%** line    | Unit + integration           |
| `infrastructure/` | **70%** line    | Integration (Testcontainers) |
| `presentation/`   | **60%** line    | E2E (Playwright)             |

Domain code is cheap to test (pure functions, no setup) so the high coverage
target is essentially free. Presentation is expensive to test; the lower target
reflects that, with the gap covered by E2E specs.

---

## Implementation notes

### Existing modules — refactor plan

1. `contacts` — add `domain/events/contact-created.event.ts` for the one event
   it emits. Move `ContactsService` methods into
   `application/commands/*.usecase.ts` files. Mostly mechanical. No change in
   behaviour.
2. `conversations` — same shape, plus extract a `ConversationStatus` value
   object since the state machine has invariants worth modelling.
3. `health` — exempt. Single controller, no domain.
4. `email` — sits under `apps/api/src/integrations/email/` (per
   `customization.md`), not under `modules/`. Different folder, same layer rules
   — `domain/` is still pure logic, `infrastructure/` wraps Resend.

This refactor lands **before** the `_template/` ships, so the template matches
at least one real, refactored module.

### Linting

A Phase 6c task adds an ESLint rule (custom or via `eslint-plugin-import`'s
`no-restricted-paths`) enforcing the dependency rule:

```json
{
  "no-restricted-paths": [
    "error",
    {
      "zones": [
        { "target": "**/domain/**", "from": "**/infrastructure/**" },
        { "target": "**/domain/**", "from": "**/presentation/**" },
        { "target": "**/domain/**", "from": "@nestjs/*" },
        { "target": "**/application/**", "from": "**/presentation/**" }
      ]
    }
  ]
}
```

CI fails any PR that violates the boundary.

---

## References

- The diagrams attached to the platform-pivot conversation — particularly the
  Customization Layer (Config, Custom Fields, Hooks, Policies, UI Slots).
- Eric Evans, _Domain-Driven Design_ (the strategic patterns).
- Vaughn Vernon, _Implementing Domain-Driven Design_ (the tactical patterns).
- Related ADRs: 0005 (BaseRepository — implements the `infrastructure/`
  repository pattern), 0007 (BullMQ — carries domain events), 0008 (Module
  Registry — defines what a module is), 0010 (Booking Core — the shared kernel
  that exemplifies this layout).
