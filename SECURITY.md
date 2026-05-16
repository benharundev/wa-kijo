# Security policy

> **Audience:** customers and security researchers.
>
> Internal engineering rules — tenant isolation, secret handling, webhook
> verification, etc. — live in
> [`.claude/rules/security.md`](.claude/rules/security.md). This file describes
> how to **report** a vulnerability and what we commit to in return.

---

## Supported versions

We provide security patches for the most recent **two minor releases** on the
current major line, and the **last minor of the previous major** for 90 days
after a new major ships.

| Version range           | Supported until                                     |
| ----------------------- | --------------------------------------------------- |
| `1.x` (current)         | latest two minors always supported                  |
| `0.x` (pre-1.0 preview) | best-effort while < 1.0; upgrade to 1.x recommended |

Customers on the **Agency** and **Enterprise** tiers receive backported patches
for any supported version under their support window. Solo and Team tier
customers are expected to upgrade to a supported version to receive a fix.

Check the version installed in your fork:

```bash
cat package.json | grep version
```

The full release history lives in [`CHANGELOG.md`](CHANGELOG.md).

---

## Reporting a vulnerability

**Do not file public issues for security reports.** Public disclosure before a
patch is available puts every customer at risk.

Email **security@wakijo.dev** (PGP key fingerprint:
`TBD — to be published before 1.0`) with:

1. A description of the issue and its impact.
2. Steps to reproduce, including a minimal proof-of-concept if possible.
3. The version of wa'kijo affected (`git rev-parse HEAD` output is fine).
4. Your contact details and disclosure timeline preferences.

If your report concerns an active customer-facing incident on infrastructure
operated by us (e.g. wakijo.dev itself), include "INCIDENT" in the subject line
— this routes the message to the on-call engineer.

We acknowledge every report within **2 business days** (Asia/Kuala Lumpur).

---

## Our commitments

For a **valid, reproducible** vulnerability we commit to:

| Action                               | Target                                         |
| ------------------------------------ | ---------------------------------------------- |
| Acknowledge receipt                  | within 2 business days                         |
| Initial impact assessment            | within 5 business days                         |
| Patch released to supported versions | severity-driven (see below)                    |
| Public advisory + CHANGELOG entry    | when patch is generally available              |
| Credit to the reporter               | in the advisory, unless anonymity is requested |

### Severity targets

| Severity     | Examples                                                               | Patch SLA                       |
| ------------ | ---------------------------------------------------------------------- | ------------------------------- |
| **Critical** | RCE, auth bypass, cross-tenant data read/write, secret exposure        | 7 calendar days                 |
| **High**     | Privilege escalation, stored XSS, IDOR within a tenant                 | 30 calendar days                |
| **Medium**   | Reflected XSS, CSRF on non-destructive endpoints, info disclosure      | 60 calendar days                |
| **Low**      | Verbose error messages, missing security headers, low-impact misconfig | best-effort, next minor release |

We use [CVSS 3.1](https://www.first.org/cvss/calculator/3.1) to assess severity.

---

## Scope

In scope:

- The wa'kijo source code as shipped in the private GitHub repository you
  received.
- The Mintlify customer documentation site at `docs.wakijo.dev` (if/when
  hosted).
- The `wakijo.dev` marketing and billing website operated by us.

Out of scope:

- Self-hosted deployments operated by you or your customers — we cannot patch
  what we cannot see. Report to your own security team.
- Bugs in third-party dependencies (Better Auth, Prisma, Next.js, etc.) — please
  report directly to the upstream maintainers. We will pull the fix into the
  next supported release.
- Social engineering of our team members.
- Denial-of-service attacks against shared infrastructure.

---

## Safe-harbour and responsible disclosure

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and
  service interruption.
- Do not exfiltrate, retain, or share customer data beyond what is necessary to
  demonstrate the vulnerability.
- Give us a reasonable window (per the SLAs above) to remediate before
  publishing details.
- Do not exploit the vulnerability beyond what is necessary to confirm it.

We will work with you to validate, fix, and credit the report. If you want to
publish a write-up, share the draft with us first so we can confirm timing with
affected customers.

---

## What we do internally

For the curious, our engineering rules enforce:

- Argon2id password hashing (via Better Auth defaults).
- HttpOnly, Secure, SameSite=Lax session cookies.
- Per-IP rate limiting on auth endpoints.
- HMAC signature verification on every inbound webhook (Stripe, Billplz,
  WhatsApp).
- Mandatory tenant scoping via `BaseRepository` — every domain query is filtered
  by `organizationId` at the data layer.
- Cross-tenant fuzz tests in CI (Phase 5+).
- Prisma parameterised queries; `$queryRawUnsafe` is forbidden without an inline
  `// EXEMPT:` justification.
- Pino structured logs with request IDs; PII redaction by allow-list.
- Quarterly secret rotation for webhook signing keys.

The complete checklist lives in
[`.claude/rules/security.md`](.claude/rules/security.md).

---

## Hall of fame

We publicly credit reporters here once 1.0 ships. If you'd like to remain
anonymous, just say so in your report.

| Reporter   | Date | Issue |
| ---------- | ---- | ----- |
| _none yet_ | —    | —     |

---

Thank you for helping keep wa'kijo and its customers secure.
