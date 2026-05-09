# ADR 0010 — Booking Core kernel and the dual-consumer test

**Date:** 2026-05-10 **Status:** Accepted **Deciders:** wa-kijo core team

> Defines the shared kernel package `@wa-kijo/booking-core` — the "Shared
> Booking Core / Scheduling Engine" in the architecture diagram — and the rule
> that prevents premature abstraction: the kernel ships only abstractions that
> have **at least two real consumers**.

---

## Context

ADR-0008 introduces the Module Registry. ADR-0009 fixes the per-module folder
shape. Both leave one question open: **what is the shape of the shared engine
that multiple business modules consume?**

The architecture reference (Module Lifecycle and Modular Enterprise SaaS
Architecture diagrams) places "Shared Engines / Booking Core" between the SaaS
Core Platform and the Business Modules. Concretely this means:

- **wa'lawe** — chess tournament manager. Players are scheduled into rounds;
  rounds have boards (resources) and time-control windows; results from one
  round drive the pairing of the next.
- **Workshop / wa-bengkel** — auto-repair appointments. Customers book service
  bays (resources) for time slots; mechanics (resources) are assigned; service
  jobs have lifecycles.
- **(Later) Property rentals, marketplace, CRM follow-ups** — same base
  concepts, different vocabularies.

The temptation is to fold all this into one big "Booking" service in
`apps/api/src/modules/booking/`. That fails for two reasons:

1. **Different vocabularies:** chess players are not "customers"; a tournament
   round is not "a service appointment"; a knockout bracket is not a "service
   job". Forcing every consumer through one model bleeds the
   most-domain-specific into the kernel.
2. **Different invariants:** Workshop allows overlapping appointments when
   they're on different bays. wa'lawe forbids overlapping pairings on any board.
   Some invariants are kernel-level; some are module-level. Separating them is
   the work.

We need a **kernel that's small enough to be honestly shared** and **business
modules that own their vocabulary**.

---

## Decision

**We extract a shared workspace package `@wa-kijo/booking-core`. The kernel is
persistence-agnostic, framework-agnostic, and contains only concepts that
genuinely apply to every consumer. Business modules provide their own
infrastructure, vocabulary, and module-specific invariants on top.**

The kernel ships in `packages/booking-core/`, parallel to `packages/db/` and
`packages/shared/`.

### What lives in the kernel

| Concept                                                                          | Why it's universal                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `TimeRange` value object                                                         | Every consumer reasons about start/end times                                |
| `Resource` interface                                                             | Players, bays, mechanics, courts — all schedulable resources                |
| `Schedulable` interface (the bookable thing)                                     | Pairings, appointments, rentals — all the same shape                        |
| `AvailabilityRule` types (working hours, blackouts, byes)                        | Every domain has scheduling constraints                                     |
| `BookingState` enum (`requested → confirmed → cancelled → completed`)            | The lifecycle is the same; only labels change                               |
| `ConflictDetectionService`                                                       | "Two confirmed Schedulables on the same Resource overlap" — domain-agnostic |
| `AvailabilityCheckService`                                                       | "Given a Resource and a TimeRange, is the resource free?" — domain-agnostic |
| Domain events: `Scheduled`, `Confirmed`, `Cancelled`, `Rescheduled`, `Completed` | Universal lifecycle events                                                  |
| `BookingPolicy` interface                                                        | Hook point for module-specific allow/deny decisions                         |
| `DomainError` subclasses (`ConflictError`, `OutsideAvailabilityError`)           | Common failure modes                                                        |

### What does NOT live in the kernel

| Concept                                     | Where it lives                  | Why                                           |
| ------------------------------------------- | ------------------------------- | --------------------------------------------- |
| Player rating / Elo / FIDE rules            | `modules/tournament/domain/`    | wa'lawe-specific; means nothing in Workshop   |
| Service job parts / labour rates            | `modules/workshop/domain/`      | Workshop-specific                             |
| Pairing algorithms (Swiss, round-robin, KO) | `modules/tournament/domain/`    | Tournament-specific                           |
| Mechanic skill matching                     | `modules/workshop/domain/`      | Workshop-specific                             |
| Customer phone / email / contact details    | `modules/contacts/domain/`      | Cross-module concept; lives in its own module |
| Prisma models                               | Each module's `infrastructure/` | Kernel is persistence-agnostic                |
| HTTP routes                                 | Each module's `presentation/`   | Kernel exposes domain logic, not endpoints    |

### The dual-consumer rule

**The kernel ships an abstraction only after at least two real consumer modules
need it.** No exceptions. This is the single most important rule for keeping the
kernel honest.

In practice:

- The `TimeRange` value object can ship immediately because we know _with
  certainty_ that wa'lawe and Workshop both use it.
- A "RecurringSchedule" abstraction does not ship until at least Workshop and
  one other module need recurring slots. Workshop alone is not enough —
  premature abstraction.
- A "Multi-stage tournament workflow" abstraction does not ship at all — it's
  wa'lawe-specific by nature.

When a candidate kernel concept has only one consumer, **it lives in that
consumer's module** until a second consumer proves the abstraction generalises.
Moving from module to kernel is a refactor with a clear trigger; the reverse is
painful.

### Layer rules inside the kernel

Following ADR-0009's dependency rule, but stricter:

```
packages/booking-core/src/
├── domain/
│   ├── time-range.vo.ts
│   ├── resource.interface.ts
│   ├── schedulable.interface.ts
│   ├── booking-state.ts
│   ├── availability-rule.ts
│   ├── services/
│   │   ├── conflict-detection.service.ts
│   │   └── availability-check.service.ts
│   ├── events/
│   │   ├── scheduled.event.ts
│   │   ├── confirmed.event.ts
│   │   ├── cancelled.event.ts
│   │   ├── rescheduled.event.ts
│   │   └── completed.event.ts
│   └── errors/
│       ├── conflict.error.ts
│       └── outside-availability.error.ts
└── application/
    └── ports/
        ├── schedulable-repository.port.ts   # interface; consumers implement
        └── domain-event-publisher.port.ts   # interface; consumers implement
```

The kernel has **no `infrastructure/` and no `presentation/`** — those belong to
the consuming modules. The kernel exposes **ports** (interfaces) that consumers
implement; the kernel itself never imports Prisma, NestJS, or BullMQ.

This is hexagonal architecture in the kernel only. ADR-0009 stops short of full
ports-and-adapters for ordinary modules; the kernel earns the extra discipline
because it must remain swappable in tests and agnostic of the surrounding stack.

### How a consumer module wires in

```ts
// modules/tournament/domain/round.aggregate.ts
import { TimeRange, BookingState, Schedulable } from '@wa-kijo/booking-core';

export class TournamentRound implements Schedulable {
  constructor(
    public readonly id: string,
    public readonly tournamentId: string,
    public readonly number: number,
    public readonly window: TimeRange,
    public state: BookingState,
    public readonly pairings: Pairing[],
  ) {}

  // module-specific invariants live here
  assignPairings(pairings: Pairing[]): void {
    if (this.state !== 'requested') {
      throw new RoundAlreadyStartedError(this.id);
    }
    if (pairings.length === 0) {
      throw new EmptyPairingsError(this.id);
    }
    // Booking Core's ConflictDetectionService is invoked from the use case,
    // not from inside the aggregate — this method only enforces the
    // rules that belong to the Round aggregate itself.
    this.pairings.push(...pairings);
  }
}
```

```ts
// modules/tournament/application/commands/start-round.usecase.ts
import { ConflictDetectionService } from '@wa-kijo/booking-core';

@Injectable()
export class StartRoundUseCase {
  constructor(
    private readonly tournaments: TournamentsRepository,
    private readonly boards: BoardsRepository,
    private readonly conflicts: ConflictDetectionService, // kernel
    private readonly events: EventBus,
  ) {}

  async execute(ctx: RequestContext, dto: StartRoundDto) {
    const tournament = await this.tournaments.findById(ctx, dto.tournamentId);
    const otherBookings = await this.boards.findOverlappingInRange(
      ctx,
      dto.window,
    );

    const round = tournament.startNextRound(dto.window, dto.now);

    this.conflicts.assertNoOverlap(round, otherBookings); // kernel call

    await this.tournaments.save(ctx, tournament);
    await this.events.publish(ScheduledEvent, kernelEventShape(round));
  }
}
```

The use case **orchestrates**:

1. Load aggregates (module repos).
2. Call kernel domain services for cross-cutting checks.
3. Mutate aggregates (module-specific invariants).
4. Save (module repo).
5. Publish kernel + module-specific events.

### Versioning

The kernel ships its own SemVer, independent of wa-kijo's platform version:

- `@wa-kijo/booking-core@0.1.0` may ship inside wa-kijo platform `0.6.0`.
- Platform `0.7.0` may ship `@wa-kijo/booking-core@0.1.5` (patch) and
  `@wa-kijo/booking-core@0.2.0` (minor) without a platform major bump.
- A breaking kernel change (renamed value object, removed event, changed port
  signature) requires `@wa-kijo/booking-core@1.0.0` and a platform major bump.

Module manifests declare their kernel range in the `dependencies` map. The
Module Registry's dependency resolver (ADR-0008) refuses to start if a module's
declared kernel range is incompatible with the installed version.

### When forking is the right answer

The diagram's hierarchy — config → custom fields → hooks → policies → UI slots →
custom module → fork as last resort — is real. The kernel plus the customisation
layer cover ~95% of buyer needs. The remaining ~5% legitimately requires
forking. Indicators that forking is the right call:

1. The buyer needs a domain rule that **contradicts** a kernel invariant (not
   extends; contradicts). Example: a kernel that forbids overlapping pairings,
   but the buyer runs a simul where one player is on multiple boards
   simultaneously by design.
2. The buyer needs schema changes that break our migrations.
3. The buyer is on a regulated platform (GovTech) where they cannot accept
   upstream updates without re-certification.

Forks are governed per the Fork Governance flow in the diagram (Freeze Base
Version → FORK.md → Track Upstream → Manual Merge → Compatibility Tests).
Documented in [`docs/customization.md`](../customization.md) and surfaced in the
customer Mintlify guide.

---

## Alternatives considered

### One big "Booking" module instead of a kernel + consumers

- Single module, single Prisma schema, polymorphic by `type` field.
- **Why rejected:** Forces tournament-specific concerns ("Swiss pairing",
  "Buchholz tiebreak") and workshop-specific concerns ("labour rate", "parts
  list") into a shared schema. Migration conflicts compound. Type-safety
  degrades to runtime checks. The wa-kijo customer story breaks: a customer who
  wants Workshop only shouldn't carry chess-tournament tables.

### Plugin model where each consumer registers extensions to a generic Booking aggregate

- Booking is an aggregate; consumers add fields and behaviour via hooks.
- **Why rejected:** This is what the customisation layer (next ADR) does for
  _tenants_. Reusing it for _modules_ means the kernel must know about every
  consumer's hook points up front, which defeats the purpose of a clean kernel.
  Modules sit _above_ the kernel, not as hook subscribers to it.

### Inheritance: business aggregates extend kernel aggregates

- `class TournamentRound extends KernelBooking { ... }`
- **Why rejected:** Inheritance across package boundaries couples the kernel to
  consumer concerns. Adding a method to a base class affects every subclass
  everywhere. **Composition over inheritance** is the rule —
  `TournamentRound implements Schedulable` and _holds_ a `TimeRange`; it doesn't
  _extend_ anything.

### Skip the kernel entirely; copy-paste shared code per module

- "Three strikes then refactor" — let the patterns emerge.
- **Why rejected for now:** wa'lawe and Workshop are the _first_ two modules. We
  have the strikes. Waiting for a third would mean shipping wa'lawe-as-module
  without a kernel, then refactoring before Workshop ships. The rework cost
  outweighs the early-design cost.

---

## Consequences

### Positive

- **Two products on one platform** with a kernel that genuinely represents what
  they share. The customer story is honest.
- **Pure domain testing**. The kernel has no I/O — `vitest run` against the
  kernel package is sub-second and CI-friendly.
- **Independent kernel versioning**. We can ship kernel patches that fix
  invariants without forcing a platform-wide release.
- **The dual-consumer rule prevents abstraction creep.** A new abstraction must
  justify itself by serving two real codebases.

### Negative

- **One more workspace package to build and version.** Every module rebuild now
  waits on the kernel rebuild. Acceptable; the kernel is small and TypeScript
  watches both.
- **Mappers required.** Each consumer module maps Prisma rows into kernel-shaped
  objects (`TimeRange`, `BookingState`) and back. Boilerplate; acceptable for
  type safety.
- **The kernel becomes the most-tested code in the codebase.** That's a good
  thing, but it's a real cost — invariant tests are exhaustive (overlapping
  ranges, edge-of-day, DST transitions, zero-length, reversed bounds). Ship the
  test cases first.
- **A kernel mistake is a wide-blast-radius mistake.** Changes to `TimeRange`
  semantics affect every consumer. Treat with major-bump discipline.

### Neutral

- The kernel sits parallel to `@wa-kijo/db` (Prisma) and `@wa-kijo/shared`
  (DTOs). Three workspace packages, distinct responsibilities. Documented in
  `docs/architecture.md` once the kernel ships.

---

## Implementation notes

### Bootstrapping the kernel package

Phase 6b creates `packages/booking-core/` with:

- `package.json` declaring the conditional `exports` pattern (matching
  `@wa-kijo/db` and `@wa-kijo/shared`).
- `src/domain/` populated with the universal value objects, interfaces, and
  domain services listed above.
- `src/application/ports/` with the port interfaces.
- A test suite covering invariants exhaustively.
- **Zero infrastructure code** — no Prisma, no NestJS, no BullMQ.

### What ships in version 0.1.0 of the kernel

The minimum that supports both wa'lawe and Workshop:

| File                                               | Purpose                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `domain/time-range.vo.ts`                          | Value object with `overlaps()`, `contains()`, `durationMinutes()`, equality |
| `domain/booking-state.ts`                          | State enum + valid-transition table                                         |
| `domain/resource.interface.ts`                     | The `Resource` shape (id, name, capacity)                                   |
| `domain/schedulable.interface.ts`                  | The `Schedulable` shape (id, resourceId, range, state)                      |
| `domain/availability-rule.ts`                      | Working hours, blackouts, recurrence — minimal v1                           |
| `domain/services/conflict-detection.service.ts`    | `assertNoOverlap()`, `findOverlaps()`                                       |
| `domain/services/availability-check.service.ts`    | `isAvailable()`, `nextAvailableSlot()`                                      |
| `domain/events/*.event.ts`                         | The five lifecycle events with Zod schemas                                  |
| `domain/errors/*.error.ts`                         | `ConflictError`, `OutsideAvailabilityError`                                 |
| `application/ports/schedulable-repository.port.ts` | Interface consumers implement                                               |
| `application/ports/domain-event-publisher.port.ts` | Interface consumers implement                                               |

Things deferred to 0.2.0 (after both consumers prove the need):

- `RecurringSchedule` (currently only Workshop wants it).
- `BookingCapacity` (resource may host N concurrent Schedulables — needed for
  property rentals later).
- `WaitlistService`.

### Test strategy

The kernel tests are pure unit tests with **exhaustive case enumeration** for
every value object and domain service. Examples:

```ts
describe('TimeRange.overlaps', () => {
  // 13 case enumeration: identical, contained, contains, partial-left,
  // partial-right, touching-end, touching-start, gap-left, gap-right,
  // zero-length-inside, zero-length-equal, reversed-bounds (rejected
  // at construction), DST-spanning.
});
```

Coverage target: **95%+ on `domain/`**, full mutation testing once we ship
Stryker (Phase 7+).

---

## References

- The Modular Enterprise SaaS Architecture diagram — "Shared Engines" column.
- Eric Evans, _Domain-Driven Design_, Ch. 14 — Maintaining Model Integrity
  (Shared Kernel).
- Vaughn Vernon, _Implementing Domain-Driven Design_, Ch. 3 — Context Mapping
  (Shared Kernel pattern).
- Related ADRs: 0008 (Module Registry — kernel-version compatibility), 0009
  (Pragmatic DDD — the layer rules the kernel follows strictly).
