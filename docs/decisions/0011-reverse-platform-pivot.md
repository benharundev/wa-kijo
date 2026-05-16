# ADR 0011 — Reverse the platform pivot; wa'kijo is the enterprise foundation under wa'lawe

**Date:** 2026-05-17 **Status:** Accepted — partially supersedes ADR-0008,
modifies ADR-0009 and ADR-0010 **Deciders:** wa-kijo core team

> This ADR reverses the platform-with-pluggable-modules direction set by
> ADR-0008 (2026-05-10) and scopes wa'kijo back to "enterprise SaaS foundation
> under one business module — wa'lawe." Module Registry, Customization Layer,
> and kernel governance are dropped from v1.0. Pragmatic DDD becomes a
> recommended internal pattern, not enforced policy. Booking Core stays as the
> scheduling engine for wa'lawe but lives as an in-API NestJS module, not a
> versioned workspace package.

---

## Context

ADR-0008 introduced a platform thesis: wa'kijo becomes a multi-module platform,
every business domain ships as a registered module, tenants enable or disable
modules per organisation. ADR-0009 added strict per-module DDD folders enforced
by ESLint. ADR-0010 made Booking Core a workspace package with frozen public API
and independent SemVer.

That direction was right for a portfolio of N business modules (wa-kiro,
wa-lawe, wa-bengkel, and beyond). It is wrong for the portfolio we actually plan
to ship in v1.0.

Two scope decisions, both taken on 2026-05-17, force this reversal:

1. **v1.0 is wa'kijo + wa'lawe only.** No second business module in scope.
   Future modules either fork wa'kijo or are built as separate apps. The Module
   Registry exists to enable/disable modules per tenant — meaningless with one
   module. The Customization Layer exists to let tenants and future modules
   customize without forking — meaningless with one tenant archetype (chess
   organisations) and no second module.
2. **Enterprise day-one positioning.** wa'kijo must pass SOC 2 / SSO / SCIM /
   audit-streaming requirements at v1.0 GA. The capacity to do this well is
   finite. Every week spent on Module Registry plumbing is a week not spent on
   SSO / SCIM / audit hardening, which directly gate revenue.

Continuing under ADR-0008's direction would mean shipping a multi-module
platform runtime that has exactly one consumer (wa'lawe) and no validation loop
for whether its abstractions are correct. That is the textbook platform
over-engineering failure mode.

Forking wa'kijo per future product is the explicit fallback. That cost is
acceptable because future products are post-v1.0 and may not happen at all.

---

## Decision

**For v1.0 scope, wa'kijo is the enterprise SaaS foundation under wa'lawe. We
drop the platform-pluggability machinery and ship wa'lawe as a normal feature
module inside the wa'kijo NestJS application.**

Concretely:

1. **Drop Module Registry runtime.** The `Module` and `TenantModule` Prisma
   models, manifest scanner, dependency resolver, and `@RequireModule()` guard
   introduced by ADR-0008 are not built in v1.0. FR-1101 through FR-1112 are
   deferred post-v1.0. wa'lawe wires into wa'kijo via standard NestJS module
   imports.

2. **Drop Customization Layer.** Config overrides, custom-field storage, hook
   event bus, resource policies, and UI slots (ADR-0008's FR-1401–1409) are not
   built in v1.0. wa'lawe ships with a fixed feature set per tenant.
   Tenant-specific customizations, if needed later, are handled by code changes
   shipped as wa'kijo releases.

3. **Soften Pragmatic DDD (ADR-0009).** The per-module
   `domain / application / infrastructure / presentation` folder layout remains
   a _recommended pattern_ for clarity inside large modules. The ESLint
   `no-restricted-paths` enforcement (FR-1303) is removed. The `_template/`
   scaffold in the repo is kept as a reference but is no longer load-bearing
   kernel governance.

4. **Booking Core stays as an in-API NestJS module (ADR-0010 modified).** The
   kernel content survives — `TimeRange`, `BookingState`, `Resource`,
   `Schedulable`, `AvailabilityRule`, `ConflictDetectionService`,
   `AvailabilityCheckService`, lifecycle events. It lives at
   `apps/api/src/modules/booking/`, not as `@wa-kijo/booking-core`. No public
   API freeze, no independent SemVer, no consumer-versioning ceremony. The
   `@wa-kijo/booking-core` workspace package is rolled back into
   `apps/api/src/modules/booking/` as a follow-up task.

5. **Engines-first build order (Path 2).** All 11 shared engines build into
   wa'kijo _before_ wa'lawe development starts: Audit + Storage in Phase 6;
   Notification + Communication in Phase 8; Booking Core, Workflow, Document,
   Report, Inventory Core, Invoice Core in Phase 9. wa'lawe begins in Phase 10.
   This sequencing was chosen with full awareness that Workflow / Report /
   Inventory Core / Invoice Core have no in-scope consumer in v1.0 (see
   "Negative consequences").

6. **Commercial SKU model.** wa'kijo ships as one Apache-2.0 Community edition
   plus five commercial tiers A–E (Starter / Pro / Team / Enterprise / OEM).
   wa'lawe is open-sourced as a separate MIT repository; running it requires
   wa'kijo Pro (Tier B) or higher because it depends on Booking Core. Full SKU
   detail in `docs/prd.md` §8.

---

## Alternatives considered

### Alternative A — Keep the platform thesis (continue ADR-0008)

- **What it is:** Continue building Module Registry, Customization Layer,
  Booking Core as a workspace package. Ship wa'lawe as the first registered
  module. Defer the second module post-v1.0 but keep all the pluggability
  machinery.
- **Why considered:** Preserves the investment already made in ADRs
  0008/0009/0010. Optionality for future modules.
- **Why rejected:** A platform with exactly one module is overhead with no
  payback. The Module Registry runtime, Customization Layer, and Booking Core
  workspace-package ceremony together represent ~2–3 months of engineering work
  whose value is hypothetical. We can re-introduce pluggability later when an
  actual second module is committed.

### Alternative B — Build engines lazily (only what wa'lawe needs)

- **What it is:** Skip Workflow / Report / Inventory Core / Invoice Core
  entirely. Build only the engines wa'lawe consumes: Audit, Storage,
  Notification, Communication, Booking Core, Document.
- **Why considered:** Fastest path to v1.0. Smallest code surface. No
  speculative abstractions. Aligned with YAGNI.
- **Why rejected:** The user explicitly chose Path 2 (build complete engine
  foundation first) after being shown this trade-off. The product positioning
  preference is "feel-complete foundation," even at the cost of speculative
  engine work. Documented as the eyes-wide-open caveat in CLAUDE.md.

### Alternative C — Stay on the original fork-per-product model

- **What it is:** Revert all the way to pre-2026-05-10. Every future product
  (wa-lawe, wa-bengkel, wa-kiro) is a hard fork of wa'kijo's current tag. No
  shared platform code beyond what's frozen at fork time.
- **Why considered:** Simplest mental model. Zero platform plumbing.
- **Why rejected:** Defeats the SKU commercial model. Buyers of Tier B+ expect
  to receive 12–24 months of platform updates. Hard forks make upstream-merging
  painful for buyers and for us. The SKU-tier update windows in §8 of the PRD
  require a maintainable single mainline.

---

## Consequences

### Positive

- **Faster v1.0.** Estimate moves from "12–18 months under ADR-0008" to "9–12
  months for engines-only Path 1, 15–22 months for Path 2." Either way, less
  code than the platform thesis required.
- **Less abstraction debt.** No speculative pluggability surface to maintain.
  Wrong abstractions are the most expensive kind of code.
- **Clearer SKU positioning.** Tiers A–E map to capabilities, not to
  enable/disable module flags. Marketing is simpler.
- **Enterprise-readiness is the differentiator.** Without the distraction of
  platform plumbing, Phase 6 (SSO / SCIM / audit hardening) gets the engineering
  bandwidth it needs to compete with HubSpot / Salesforce / ServiceNow on
  procurement.

### Negative

- **Speculative-engine risk.** Path 2 means we build Workflow, Report, Inventory
  Core, and Invoice Core with no in-scope consumer. The abstractions are
  unvalidated. We accept that 1–2 of these four will likely need significant
  refactoring if a real consumer ever arrives. The CLAUDE.md eyes-wide-open
  caveat documents this explicitly.
- **Future re-platformization is now a migration, not a configuration.** If a
  real second business module emerges post-v1.0 and we decide to reintroduce
  pluggability, we will be writing a Module Registry against an already-shipped
  wa'kijo + wa'lawe codebase. The retrofit will be harder than building it
  greenfield. We accept this.
- **No in-product enable/disable per tenant.** Customers who want wa'lawe
  features turned off per tenant have to do it via feature flags inside the
  module code, not via a registry switch. For v1.0 this is fine — one feature
  set, all tenants.
- **`@wa-kijo/booking-core` workspace package work is wasted.** The scaffolding
  from Phase 6b will be rolled back into `apps/api/src/modules/booking/`. A few
  days of engineering effort is lost. Acceptable.

### Neutral

- ADR-0008 (Module Registry), ADR-0009 (Pragmatic DDD strict layout), and
  ADR-0010 (Booking Core kernel) become historical context. They are _partially_
  superseded, not fully — their analyses of _why_ a platform would be valuable
  remain accurate; only the _decision_ to build one now is reversed. Future
  readers should treat them as record of the path not taken.
- The `_template/` scaffold from FR-1302 stays in the repo as an optional
  reference pattern. New modules can ignore it.

---

## Implementation notes

Follow-up tasks unblocked by this ADR:

1. **Roll back `@wa-kijo/booking-core` workspace package** into
   `apps/api/src/modules/booking/`. Drop the conditional-exports indirection in
   `package.json`. Update imports inside the API.
2. **Remove or branch-archive Module Registry scaffolding** from any Phase 6a
   design work that exists in the repo. The `Module` and `TenantModule` Prisma
   models should not appear in `packages/db/prisma/schema.prisma` for v1.0.
3. **Update FR-1100, FR-1300, and FR-1400 series statuses** in `docs/prd.md` to
   reflect "Deferred post-v1.0" or "Softened to recommended pattern" as
   appropriate (handled as a separate small PR).
4. **Decide WorkOS vs build for SSO/SCIM** — flagged as an open decision, not
   part of this ADR. Likely ADR-0012.
5. **wa'lawe repo setup** — create `wa-lawe` as a public repository under MIT
   licence with a README that explicitly states "requires wa'kijo Pro (Tier B)
   or higher to run."

---

## References

- **Supersedes / modifies:** ADR-0008 (partially), ADR-0009 (modifies), ADR-0010
  (modifies).
- **Related:** `docs/prd.md` §4 (phase plan), §8 (commercial SKUs); the Modular
  Enterprise SaaS Architecture diagrams shared on 2026-05-17 (now reversed for
  v1.0 scope).
- **External:** n8n's Apache-2.0-with-commons-clause licence model (used as a
  reference for wa'kijo Community licensing); ShipFast, Boilerplate.dev, SaaS
  Pegasus, Bullet Train for tier pricing benchmarks.
