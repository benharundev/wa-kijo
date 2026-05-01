# Security Rules

> **Scope:** Loaded when working on files involving auth, billing, webhooks,
> tenant scoping, secrets, or any user input handling. **Why this file exists:**
> Security mistakes in AI-generated code are the most expensive bugs. This file
> is the checklist that prevents them.

## Tenant isolation — the prime directive

Every domain entity has a `workspaceId` (wa'kiro) or `orgId` (wa'kijo, wa'lawe).
**Every query that touches that entity must filter by it.**

The BaseRepository does this automatically via Prisma middleware. **If you
bypass BaseRepository, you must manually scope:**

```ts
// ❌ NEVER
const contact = await prisma.contact.findUnique({ where: { id } });

// ✅ ALWAYS — even with a unique ID, scope by tenant
const contact = await prisma.contact.findFirst({
  where: { id, workspaceId: ctx.workspaceId, deletedAt: null },
});
```

**Tests for this:** every repository has a "cross-tenant access" test that
asserts a request from workspace A cannot read/write data in workspace B.

## Authentication

- Sessions are HttpOnly, Secure, SameSite=Lax cookies.
- Password hashing via argon2id (Better Auth default).
- Email verification required before any meaningful action (configurable per
  tier).
- Magic links expire in 15 minutes. Single-use.
- Failed login throttling: max 5 attempts per IP per 15 min, then 1-hour
  cooldown.
- Session expiry: 30 days, slidable. Force re-auth on sensitive ops (billing
  changes).

## Authorisation (RBAC)

- Server-side enforcement only. Frontend permission checks are UX, not security.
- Use `@RequirePermission('resource:action')`. Don't reinvent.
- Resource-level checks (e.g., "can edit THIS post") are policies — see
  `apps/api/src/common/policies/`.
- **Default deny.** If a permission isn't explicitly granted, the user does not
  have it.

## Webhooks

- **Verify the signature on every webhook.** Meta, Stripe, Billplz all sign
  payloads. Reject silently if invalid (do not 4xx with detail — that helps
  attackers).
- **Idempotency** — webhooks retry. Use the provider's event ID as the
  idempotency key.
- **Don't trust webhook payload values for security decisions.** If Meta says a
  phone number is now verified, re-fetch from Meta's API to confirm.

```ts
// Stripe example
const sig = req.headers['stripe-signature'];
let event;
try {
  event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
} catch (err) {
  return res.status(400).end(); // no detail
}
// Process `event` — idempotent by `event.id`.
```

## Secrets management

- All secrets in environment variables. Validate at boot via Zod
  (`@packages/shared/env.ts`).
- Never commit `.env` files. `.env.example` only.
- Production secrets in your platform's secret manager (Railway / AWS SSM /
  Vault).
- Rotate webhook signing secrets quarterly.
- Encrypt at-rest secrets that must be in DB (e.g., third-party access tokens)
  using a KMS-managed key.

```ts
// ❌ NEVER
const apiKey = 'sk_live_xxxx';

// ❌ NEVER
console.log('Sending with token', token);

// ✅ ALWAYS
const apiKey = process.env.STRIPE_API_KEY;
this.logger.info({ tokenPresent: !!token }, 'Sending request');
```

## Input validation

- Every controller endpoint has a Zod-validated DTO. No exceptions.
- Validate at the boundary; trust internal types after.
- For file uploads: validate type via magic bytes, not extension or
  Content-Type. Cap size server-side.
- For HTML output (rare): use a sanitiser library, never string concatenation.

## SQL safety

- Prisma is parameterised by default. `findMany`, `where: {...}` is safe.
- `prisma.$queryRaw` and `$executeRaw` ARE parameterised when used with template
  literals: `` $queryRaw`SELECT * FROM x WHERE id = ${id}` ``.
- `$queryRawUnsafe` is exactly that. Avoid. If you must use it, comment why and
  add an explicit allow-listed input check.

## CSRF & CORS

- CSRF: HttpOnly + SameSite=Lax cookies handle most cases. Enable double-submit
  token pattern for state-changing endpoints if exposed cross-origin.
- CORS: allowlist your own domains. Never `*` in production.

## Rate limiting

- Per-IP rate limits on auth endpoints (5 req / 15 min on login).
- Per-workspace rate limits on outbound message endpoints (respect Meta tier
  limits).
- Per-API-key rate limits on public API (when we have one).

## PII & PDPA

- Right-to-delete: 30 days from request to full deletion (soft delete + cleanup
  job).
- Audit logs of admin access to PII.
- Don't log full message contents. Log message IDs and metadata.
- Backups: encrypted at rest, retention 7 days then purged.

## Penetration test before launch

Before any product hits paying customers, run:

1. **Tenant isolation fuzz test** — automated test that attempts to access
   workspace A's data as workspace B's user across every endpoint.
2. **Auth flow audit** — manual review of login, session, password reset, MFA,
   OAuth flows.
3. **Webhook verification audit** — confirm every webhook handler rejects
   invalid signatures.
4. **Secret scan** — `gitleaks` or similar across the repo history.
5. **Dependency audit** — `pnpm audit`, address criticals.
6. **Third-party scan** — Snyk or Trivy for container images.

## When something feels off

If you're about to write code that reads or writes data that "looks like" it
could belong to another tenant, **stop**. Re-read this file. Ask in chat or PR.
Tenant leaks are the most likely catastrophic bug class in this product line.
