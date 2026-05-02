# Support

Welcome. Thank you for being a wa'kijo customer. This document explains how
to get help, what to expect, and where to look first.

> **TL;DR** — read the docs, search the changelog, then file a ticket. The
> faster you give us reproducible details, the faster you get a fix.

---

## Self-serve first

Before opening a support ticket, the answer is probably already in one of
these:

| Question | Look here |
|---|---|
| "How do I install / run wa'kijo locally?" | [`docs/runbook.md`](docs/runbook.md) and [`docs-site/quickstart.mdx`](docs-site/quickstart.mdx) |
| "How does X work?" | [`docs/architecture.md`](docs/architecture.md), [`docs-site/concepts/`](docs-site/concepts) |
| "How do I add a new feature module?" | [`docs-site/guides/add-feature-module.mdx`](docs-site/guides/add-feature-module.mdx) |
| "How do I deploy to production?" | [`docs/deployment.md`](docs/deployment.md), [`docs-site/guides/deploy-to-railway.mdx`](docs-site/guides/deploy-to-railway.mdx) |
| "What changed in this release?" | [`CHANGELOG.md`](CHANGELOG.md) |
| "How do I upgrade?" | [`docs/upgrade-guide.md`](docs/upgrade-guide.md) |
| "What does this term mean?" | [`docs/glossary.md`](docs/glossary.md) |
| "Why is X built this way?" | [`docs/decisions/`](docs/decisions/) (ADRs) |

If you searched everywhere and the answer is missing or wrong, that itself is
a support issue — please file it as a docs bug.

---

## Support channels by tier

| Tier | Primary channel | SLA (first response, business hours, Asia/Kuala Lumpur) |
|---|---|---|
| **Solo** | Customer Discord — `#help` channel | Best-effort, community-supported |
| **Team** | `support@wakijo.dev` | Within **2 business days** |
| **Agency** | `support@wakijo.dev` + private Discord channel | Within **1 business day** + 1 hour onboarding call |
| **Enterprise** | Shared Slack Connect channel + named CSM | Within **same business day**, with named engineer for incidents |

A "business day" is Monday through Friday, 09:00–18:00 Asia/Kuala Lumpur,
excluding Malaysian public holidays.

These SLAs cover **first response**. Time-to-resolution depends on severity
(see [`SECURITY.md`](SECURITY.md) for the security severity matrix; we apply
the same shape to functional bugs).

---

## What we support

In scope:

- Bugs in the wa'kijo source code as shipped on the supported version branch.
- Documentation errors and gaps.
- Guidance on the intended usage patterns documented under
  [`docs-site/concepts/`](docs-site/concepts) and
  [`docs-site/guides/`](docs-site/guides).
- Help reading and interpreting the included observability output (logs,
  Sentry events, BullMQ dashboards).

Best-effort:

- One-off questions about deploying to a specific cloud or platform we don't
  document. We may not have first-hand experience but will share what we
  know.
- Code review of significant customisations on the Agency and Enterprise
  tiers, on request.

Out of scope:

- Bugs in your own customisations or third-party integrations you wrote on
  top of wa'kijo.
- Bugs in third-party dependencies — we'll happily route you to the right
  upstream maintainer, but the fix has to come from them.
- Architectural redesigns or feature requests outside the published roadmap.
- Performance tuning of your specific database, network, or cloud
  configuration.
- Onboarding to other tools in your stack (we can recommend, not implement).

---

## How to file a great ticket

A well-written ticket gets resolved 5× faster. Include:

1. **Version and commit hash.** `git rev-parse HEAD` and the contents of the
   top of `CHANGELOG.md` you have locally.
2. **Environment.** Node version (`node --version`), pnpm version, OS, and
   whether this is local dev or a deployed environment.
3. **What you did.** The exact commands or HTTP requests.
4. **What you expected to happen.**
5. **What happened instead.** Logs, stack traces, screenshots — the full
   error envelope from the API response is gold:
   ```json
   { "success": false, "statusCode": 422, "error": "VALIDATION_ERROR", ... }
   ```
6. **Minimal repro.** A single failing test, a curl command, or a 5-line
   snippet beats a 200-line dump.
7. **Impact.** Are users blocked? Is data at risk? How urgent?

For security-sensitive reports, follow [`SECURITY.md`](SECURITY.md) instead
of the regular support channel — do not paste secrets, tokens, or PII into a
shared support thread.

---

## Severity definitions for functional bugs

| Severity | Description | Target time-to-fix (Agency / Enterprise) |
|---|---|---|
| **S1 — Critical** | Production is down or data is at risk. No workaround. | Same business day, hotfix release |
| **S2 — High** | Major feature broken; workaround exists but is painful. | Within 5 business days |
| **S3 — Medium** | Bug affecting a non-core feature, or with a clear workaround. | Next minor release |
| **S4 — Low** | Cosmetic, documentation, or quality-of-life improvement. | Best-effort, when prioritised |

Solo and Team tiers receive the same fixes via the next regular release; we
do not commit to hotfix turnaround times below the Agency tier.

---

## Office hours

The wa'kijo team holds **open office hours every other Thursday** at
14:00–15:00 Asia/Kuala Lumpur, on the customer Discord voice channel. Anyone
on Team tier or above can join with no agenda. Bring questions, design
sketches, or migration headaches. Recording is opt-in and shared in
`#announcements` afterwards.

---

## Roadmap and feature requests

The active roadmap is published in `docs-site/roadmap.mdx` (added at 1.0).
Feature requests are very welcome — open them in your tier's primary
channel. We prioritise based on:

1. Customer impact (how many tiers benefit, how often it bites).
2. Strategic fit (does it stay true to the opinionated stack?).
3. Maintenance cost (will it create ongoing complexity for everyone?).

Enterprise customers can request priority on the roadmap as part of the
support agreement; talk to your CSM.

---

## Refunds and seat changes

For commercial questions — invoices, seat counts, tier changes, refunds —
email **billing@wakijo.dev**. Our refund window is 14 days from purchase, no
questions asked, provided you have not yet pushed wa'kijo source to a
public repository or distributed it externally.

---

We're a small team that cares a lot about the product. The shorter the path
from "this is broken" to "here's the diff that fixes it", the better life is
for everyone. Help us help you.
