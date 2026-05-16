# Support

How to get help with wa'kijo.

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

| Channel                                                                  | What it's for                                                                | Response expectation                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| [GitHub Discussions](https://github.com/benharundev/wa-kijo/discussions) | Open-ended questions, "how do I…" help, design feedback, roadmap suggestions | Best-effort by maintainers and the community |
| [GitHub Issues](https://github.com/benharundev/wa-kijo/issues)           | Reproducible bugs only — please include version, environment, repro steps    | Triaged within 1 week                        |
| [`SECURITY.md`](SECURITY.md)                                             | Privately disclosing vulnerabilities                                         | Same-business-day acknowledgment             |

Support is **best-effort, no SLA**. Maintainers are not full-time on this —
gentle nudges after a week of silence are fine.

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

## What's in scope

**In scope:**

- Bugs in wa'kijo source code on `main` or a tagged release.
- Documentation errors or gaps in the public docs.
- Questions about intended usage of features that exist in the repo.
- Help interpreting logs, Pino output, BullMQ dashboards.

**Out of scope** (won't be triaged):

- Your own customisations or third-party integrations built on top of wa'kijo.
- Bugs in third-party dependencies — file upstream with the original maintainer.
- Performance tuning of your specific cloud / DB / network setup.
- Architectural redesigns outside the published roadmap.

---

## Severity definitions

| Severity          | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| **S1 — Critical** | Production is down or data is at risk. No workaround.         |
| **S2 — High**     | Major feature broken; workaround exists but is painful.       |
| **S3 — Medium**   | Bug affecting a non-core feature, or with a clear workaround. |
| **S4 — Low**      | Cosmetic, documentation, or quality-of-life.                  |

S1 and S2 are prioritised in the next minor release; S3/S4 are best-effort.

---

## Roadmap and feature requests

The active roadmap is in [`docs/prd.md` §4](docs/prd.md#4-phases). Feature
requests are welcome — open a
[Discussion](https://github.com/benharundev/wa-kijo/discussions). Many users
asking for the same thing moves it up.

Prioritisation criteria:

1. Impact (how many users benefit, how often it bites).
2. Strategic fit (does it stay true to the opinionated stack?).
3. Maintenance cost (will it create ongoing complexity for everyone?).
