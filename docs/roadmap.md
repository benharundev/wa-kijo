# wa'kijo roadmap

> Phase-by-phase scope and build order through v1.0 GA, plus the open decisions
> and "eyes-wide-open" caveats that shape what gets built when.
>
> **Strategic re-sort (2026-05-17, final):** two decisions reshape this roadmap:
>
> 1. **Enterprise day-one positioning.** SSO/SCIM/SAML in P0, not P1. Outbound
>    webhooks + public API + API keys are core, not paid add-ons.
> 2. **wa'kijo + wa'lawe only, "engines first" build order (Path 2 + b).** No
>    platform thesis. No Module Registry. No Customization Layer. All 11 shared
>    engines build into wa'kijo _before_ wa'lawe development starts. wa'lawe
>    ships as a normal feature module inside wa'kijo.
>
> See `@docs/decisions/0011-reverse-platform-pivot.md` for the ADR that locked
> this in. v1.0 estimate: **~15–22 months** from 2026-05-17. The wider range
> reflects the speculative-engine risk (see "eyes-wide-open" note below).

## Phase status

| Phase        | Epoch                          | Scope                                                                                                                                                                                                                                                         | Status         |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1            | Foundation                     | Repo skeleton, tooling, Docker Compose, tsconfig                                                                                                                                                                                                              | ✅ Complete    |
| 2            | Foundation                     | NestJS API scaffold, Prisma schema, BaseRepository                                                                                                                                                                                                            | ✅ Complete    |
| 3            | Foundation                     | Better Auth, multi-tenant org hierarchy                                                                                                                                                                                                                       | ✅ Complete    |
| 4            | Foundation                     | Next.js frontend scaffold                                                                                                                                                                                                                                     | ✅ Complete    |
| 5            | Foundation                     | Domain feature modules (contacts, conversations, messages, tags, audit log)                                                                                                                                                                                   | ✅ Complete    |
| **6**        | **A · Platform Hardening**     | Audit engine (hardening) · Storage engine · MFA/2FA · SSO (SAML+OIDC) · SCIM 2.0 · session mgmt UI · impersonation · IP allowlist · org lifecycle · maintenance mode                                                                                          | 🚧 In progress |
| **7**        | **B · Compliance & DX**        | OpenTelemetry · metrics · Sentry · GDPR export · right-to-delete · field-level encryption · retention policies · OpenAPI auto-gen · public API + keys · outbound webhooks                                                                                     | Planned        |
| **8**        | **C · Commerce & White-Label** | Notification engine · Communication engine · usage metering · quota enforcement · invoices/receipts UI · tax/VAT · manual invoicing · custom domains · white-labeling · full i18n · **Billplz + Curlec providers**                                            | Planned        |
| **9**        | **D · Engines Build-out**      | **Booking Core** (with Availability folded in) · **Workflow** · **Document** · **Report** · **Inventory Core** · **Invoice Core**. Engines-only — no business module yet                                                                                      | Planned        |
| **10**       | **E · wa'lawe + v1.0 GA**      | **wa'lawe (chess tournaments)** built on the completed engine foundation · super-admin console full · tenant lifecycle ops · sandbox/test mode · TypeScript SDK · Bull-Board with RBAC · Mintlify customer docs at `docs.wakijo.dev` · v1.0 Enterprise GA tag | Planned        |
| **Post-1.0** | —                              | Second business module (TBD) · search (Postgres FTS → Meilisearch) · push notifications · Python SDK · trusted device mgmt · brand kit · coupons/promo · dunning · data residency                                                                             | Backlog        |

**Phase 6 is the critical path.** Audit engine hardening + Storage engine must
ship first — every downstream phase writes files and audit events. The Booking
Core kernel scaffold and Pragmatic DDD `_template/` that pre-date ADR-0011 stay
in the repo as architectural patterns but are no longer load-bearing kernel
governance — they get folded into Phase 9's engines build-out as regular NestJS
modules.

## Engines first, wa'lawe second

All 11 shared engines must complete before any wa'lawe code is written:

- **Phase 6 engines:** Audit, Storage (P0 SaaS Core, needed regardless of
  modules)
- **Phase 8 engines:** Notification, Communication (pair with commerce UX work)
- **Phase 9 engines:** Booking Core (+Availability), Workflow, Document, Report,
  Inventory Core, Invoice Core (built before any consumer exists)
- **Phase 10 module:** wa'lawe consumes the engines, validates abstractions,
  ships with v1.0 GA polish

## Eyes-wide-open caveat (recorded 2026-05-17)

Under the (b) scope narrowing, four of the 11 engines have no in-scope consumer
in v1.0:

- **Workflow** — wa'lawe's lifecycle is a simple 5-state machine that could live
  inline
- **Report** — wa'lawe standings live inside wa'lawe
- **Inventory Core** — no wa-stok in scope
- **Invoice Core** — no wa-invois in scope; platform Billing handles SaaS subs

These four are built speculatively because the user explicitly chose Path 2
("build complete engine foundation first"). Acceptable trade-off if the goal is
a feel-complete foundation; high risk that 1–2 of these need refactoring if a
real consumer ever arrives. **Do not invent abstractions you can't validate** —
when in doubt while building these four, prefer the simplest schema and clearest
extension point over elegance. Future consumers will tell you what was actually
needed.

## Shared engines packaging (locked 2026-05-17)

None of the 11 engines ship as workspace packages in v1.0. All will land as
in-API NestJS modules under `apps/api/src/modules/` when their phase arrives.
The `@wa-kijo/booking-core` workspace package that existed pre-2026-05-17 was
removed in the v0.6.0 cleanup; its source remains in git history if it ever
needs to be revived. Workspace-package promotion is a post-v1.0 decision
triggered by an actual second module needing independent SemVer.

## Open decisions

- **SSO/SCIM build vs buy** — WorkOS ($125/connection/month, bundles SSO, SCIM,
  Directory Sync, and Audit Logs into one integration, ~6–8 weeks faster to
  enterprise-ready) vs roll-your-own. No ADR yet.
- **Speculative-engine scope** — Workflow, Report, Inventory Core, Invoice Core
  have no in-scope consumer. Open question: build them as thin abstract-stub
  kernels (cheap, may need refactor) or as fuller speculative designs
  (expensive, higher refactor risk)? Recommend thin stubs.
