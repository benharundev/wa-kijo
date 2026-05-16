# Support

How to get help with wa'kijo. Different channels for different levels — pick the
one that matches what you need.

---

## Quick triage

| Question                                  | Where to look                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "How do I install / run wa'kijo locally?" | [`README.md` quickstart](README.md#quick-start), [`docs/runbook.md`](docs/runbook.md)              |
| "How does X work?"                        | [`docs/architecture.md`](docs/architecture.md), [`docs-site/concepts/`](docs-site/concepts)        |
| "How do I add a new feature module?"      | [`CONTRIBUTING.md` § feature-module checklist](CONTRIBUTING.md#adding-a-feature-module--checklist) |
| "How do I deploy to production?"          | [`docs/deployment.md`](docs/deployment.md), [`docs-site/guides/`](docs-site/guides)                |
| "What changed in this release?"           | [`CHANGELOG.md`](CHANGELOG.md)                                                                     |
| "How do I upgrade?"                       | [`docs/upgrade-guide.md`](docs/upgrade-guide.md)                                                   |
| "What does this term mean?"               | [`docs/glossary.md`](docs/glossary.md)                                                             |
| "Why is X built this way?"                | [`docs/decisions/`](docs/decisions/) (ADRs)                                                        |

If the answer is missing or wrong, that itself is a contribution opportunity —
open a PR or a docs issue.

---

## Support channels

### wa'kijo Community (Apache 2.0 OSS)

| Channel                                                                  | What it's for                                                                | Response expectation                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| [GitHub Discussions](https://github.com/benharundev/wa-kijo/discussions) | Open-ended questions, "how do I…" help, design feedback, roadmap suggestions | Best-effort by maintainers and the community |
| [GitHub Issues](https://github.com/benharundev/wa-kijo/issues)           | Reproducible bugs only — please include version, environment, repro steps    | Triaged within 1 week                        |
| [`SECURITY.md`](SECURITY.md)                                             | Privately disclosing vulnerabilities                                         | Same-business-day acknowledgment             |

Community support is **best-effort, no SLA**. Maintainers are not full-time on
this — gentle nudges after a week of silence are fine.

### wa'kijo Pro and higher tiers (commercial)

Paid tiers ship from the private
[`wa-kijo-pro`](https://github.com/benharundev/wa-kijo-pro) repo and include
direct support with response-time commitments.

| Tier               | Channel                                 | First-response SLA                    |
| ------------------ | --------------------------------------- | ------------------------------------- |
| **A · Starter**    | `support@wakijo.dev`                    | 3 business days                       |
| **B · Pro**        | `support@wakijo.dev`                    | 2 business days                       |
| **C · Team**       | `support@wakijo.dev`                    | 1 business day                        |
| **D · Enterprise** | Shared Slack Connect + named maintainer | Same business day                     |
| **E · OEM**        | Direct line + quarterly office hours    | Same business day + scheduled cadence |

A "business day" is Monday through Friday, 09:00–18:00 Asia/Kuala Lumpur,
excluding Malaysian public holidays.

The SLAs above cover **first response**. Time-to-resolution depends on severity
(see § Severity below).

For commercial questions — invoices, tier changes, refunds, custom contracts —
email **billing@wakijo.dev**.

---

## How to file a great ticket / issue

A well-written ticket gets resolved 5× faster. Include:

1. **Version and commit hash.** Run `git rev-parse HEAD` and the latest line of
   `CHANGELOG.md` you have locally.
2. **Environment.** Node version (`node --version`), pnpm version, OS, local dev
   vs deployed.
3. **What you did.** The exact commands or HTTP requests.
4. **What you expected.**
5. **What happened instead.** Logs, stack traces, screenshots. The full error
   envelope from the API is gold:
   ```json
   { "success": false, "statusCode": 422, "error": "VALIDATION_ERROR", ... }
   ```
6. **Minimal repro.** A failing test, a curl command, or a 5-line snippet beats
   a 200-line dump.
7. **Impact.** Are users blocked? Is data at risk? How urgent?

For security-sensitive reports, follow [`SECURITY.md`](SECURITY.md) — do not
paste secrets, tokens, or PII into a public issue or shared support thread.

---

## What's in scope vs out of scope

### Community (GitHub Issues / Discussions)

**In scope:**

- Bugs in wa'kijo Community source code on `main` or a tagged release.
- Documentation errors or gaps in the public docs.
- Questions about intended usage of features that exist in Community.
- Help interpreting Community's logs, Pino output, BullMQ dashboards.

**Out of scope** (won't be triaged):

- Your own customisations or third-party integrations built on top of wa'kijo.
- Bugs in third-party dependencies — file upstream with the original maintainer.
- Performance tuning of your specific cloud / DB / network setup.
- Feature requests for Pro-tier capabilities (SSO, SCIM, the 11 engines, etc.) —
  those land on the Pro roadmap, not in Community.
- Architectural redesigns outside the published roadmap.

### Pro and higher tiers

**Additionally in scope:**

- Bugs in Pro-only features (SSO, SCIM, the 11 shared engines, audit hardening,
  etc.).
- One-off questions about deploying to a specific cloud or platform — we'll
  share what we know.
- Code review of significant customisations on Team tier and above, on request.
- Migration assistance between major versions on Enterprise tier and above.

**Still out of scope:**

- Building your product for you. We support; we don't ship.

---

## Severity definitions (Pro and higher)

| Severity          | Description                                                   | Target time-to-fix (Team / Enterprise) |
| ----------------- | ------------------------------------------------------------- | -------------------------------------- |
| **S1 — Critical** | Production is down or data is at risk. No workaround.         | Same business day, hotfix release      |
| **S2 — High**     | Major feature broken; workaround exists but is painful.       | Within 5 business days                 |
| **S3 — Medium**   | Bug affecting a non-core feature, or with a clear workaround. | Next minor release                     |
| **S4 — Low**      | Cosmetic, documentation, or quality-of-life.                  | Best-effort, when prioritised          |

Starter and Pro tiers receive the same fixes via the next regular release;
hotfix turnaround time is not committed below Team tier.

---

## Office hours (Pro+)

The wa'kijo team holds **office hours every other Thursday** at 14:00–15:00
Asia/Kuala Lumpur. Anyone on Pro tier or above can join with no agenda — bring
questions, design sketches, or migration headaches. Recording is opt-in and
shared afterwards.

Community users are welcome to ask the same questions in
[Discussions](https://github.com/benharundev/wa-kijo/discussions); they just
don't get a synchronous channel.

---

## Roadmap and feature requests

The active roadmap is in [`docs/prd.md` §4](docs/prd.md#4-phases). Feature
requests are welcome:

- **Community** — open a
  [Discussion](https://github.com/benharundev/wa-kijo/discussions). Many users
  asking for the same thing moves it up.
- **Pro+** — bring it to office hours or via `support@wakijo.dev`. Enterprise
  tier includes roadmap influence as part of the contract.

Prioritisation criteria:

1. Impact (how many users benefit, how often it bites).
2. Strategic fit (does it stay true to the opinionated stack?).
3. Maintenance cost (will it create ongoing complexity for everyone?).

---

## Refunds (Pro and higher)

14-day refund window from purchase, no questions asked, provided the private
wa-kijo-pro source hasn't been distributed externally. Email
`billing@wakijo.dev`.

---

We're a small team that cares about the product. The shorter the path from "this
is broken" to "here's the diff that fixes it", the better life is for everyone.
Help us help you.
