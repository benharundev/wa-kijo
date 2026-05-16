# Customization guide

> **Audience:** customers building a product on top of wa'kijo.
>
> wa'kijo is opinionated, but every opinion can be overridden cleanly. This
> guide walks through the most common customisations and the patterns we
> recommend so your fork stays mergeable with future wa'kijo releases.

---

## 1. The Golden Rules

1. **Don't rename core files.** Renaming `BaseRepository`, the auth guards, or
   the modules under `apps/api/src/common/` makes it harder to merge updates
   from the base repository.
2. **Add, don't subtract, in shared packages.** New permissions, new DTOs, and
   new types belong in `packages/shared/`. Existing exports should be treated as
   a contract — extending is fine, redefining is not.
3. **Layer your code on top.** New feature modules under
   `apps/api/src/modules/<your-feature>/` and new pages under
   `apps/web/src/app/(app)/<your-feature>/` are entirely yours and won't
   conflict with upstream changes.
4. **Use the upgrade guide.** [`upgrade-guide.md`](upgrade-guide.md) is the
   single source of truth for breaking changes between wa'kijo releases.

---

## 2. Branding

### Product name and metadata

Search-and-replace `wa-kijo` and `wa'kijo` everywhere it appears:

```bash
rg -l 'wa-kijo|wa.kijo' \
  --glob '!CLAUDE.md' --glob '!CHANGELOG.md' \
  --glob '!docs/decisions/*' --glob '!*.lock*'
```

Then update:

- The root `package.json` `name` and `description`.
- `apps/api/package.json` and `apps/web/package.json` `name`.
- `packages/shared/package.json` and `packages/db/package.json` `name`.
- The `BETTER_AUTH_*` cookie prefix in `apps/api/src/auth/auth.module.ts`.
- The OpenAPI title in `apps/api/src/main.ts` (`DocumentBuilder`).
- The `<title>` in `apps/web/src/app/layout.tsx`.

The `CLAUDE.md`, `CHANGELOG.md`, and ADR files should continue referring to
wa'kijo — they're the upstream artefacts you inherited and they'll keep
appearing in upstream diffs.

### Visual identity

Tailwind theme variables live in `apps/web/src/app/globals.css`:

```css
:root {
  --color-primary: 12 100% 50%; /* swap to your brand colour (HSL) */
  --color-secondary: 210 40% 96%;
  /* ... */
}
```

shadcn/ui components consume these variables, so a single file change re-skins
the entire app. The existing `--color-primary` is wa'kijo's brand orange —
change it before your first customer demo.

Logo and favicon:

- Replace `apps/web/public/logo.svg` and `apps/web/public/favicon.ico`.
- Update the `<Image>` reference in `apps/web/src/components/layout/sidebar.tsx`
  if the file path changes.

Email templates (`apps/api/src/modules/email/templates/`) include inline brand
colours and the wordmark. Update those before sending the first production
email.

---

## 3. Swapping the email provider

Resend is the default. To switch to another provider (SES, Postmark, Mailgun,
etc.):

1. Define a provider interface — already present at
   `apps/api/src/modules/email/email.provider.ts` in Phase 5.
2. Implement the new provider:
   ```ts
   @Injectable()
   export class SesEmailProvider implements EmailProvider {
     constructor(private env: EnvService) {
       /* ... */
     }
     async send(params: SendEmailParams): Promise<void> {
       /* ... */
     }
   }
   ```
3. Wire it into `EmailModule` via the `EMAIL_PROVIDER` token.
4. Update `.env.example` and `packages/shared/src/env.schema.ts`.

The `EmailService` consumes the provider through DI, so the rest of the app is
unchanged.

---

## 4. Swapping or removing the billing module

Phase 6 introduces a `BillingProvider` interface with Stripe, Billplz, and
ToyyibPay implementations. To use a provider that's not included:

1. Add an implementation:
   ```ts
   @Injectable()
   export class PaddleBillingProvider implements BillingProvider {
     async createCheckoutSession(...): Promise<CheckoutSession> { /* ... */ }
     async verifyWebhook(...): Promise<BillingEvent> { /* ... */ }
     // ... rest of the interface
   }
   ```
2. Register it in `BillingModule.forRoot({ provider: PaddleBillingProvider })`.
3. Add the new env vars to `packages/shared/src/env.schema.ts`.

To **remove billing entirely** (e.g. you charge customers manually):

1. Delete `apps/api/src/modules/billing/`.
2. Remove the `BillingModule` import from `app.module.ts`.
3. Remove the billing pages under
   `apps/web/src/app/(app)/orgs/[orgId]/billing/`.
4. Remove the `billing:*` permissions from
   `packages/shared/src/auth/permissions.ts`.

The rest of the app keeps working — billing is decoupled by design.

---

## 5. Adding a new third-party integration

Recommended pattern, applied consistently across Resend, Stripe, etc.:

```
apps/api/src/integrations/<provider>/
├── <provider>.module.ts        # NestJS module
├── <provider>.service.ts       # Wraps the SDK; only this file imports the SDK
├── <provider>.client.ts        # Constructs and configures the SDK client
├── <provider>.types.ts         # Re-exports / extends SDK types as needed
├── webhooks/                   # If the provider sends webhooks
│   ├── <provider>-webhook.controller.ts
│   └── <provider>-webhook.service.ts
└── <provider>.service.spec.ts
```

Rules:

- **One provider, one module.** No mixed Stripe + Billplz code in the same
  service.
- **Sensitive config from env only.** Never hard-code an API key.
- **Webhook signature verification is mandatory.** Reject silently on invalid
  signatures (see [`.claude/rules/security.md`](../.claude/rules/security.md)).
- **Idempotency by event ID.** Webhooks retry; idempotency saves you.

---

## 6. Adding a new auth method

Better Auth supports many strategies (passkeys, OAuth providers, OTP). To enable
one:

1. Install the relevant Better Auth plugin (or write one — Better Auth's plugin
   API is documented).
2. Add it to the `betterAuth({...})` config in
   `apps/api/src/auth/auth.module.ts`.
3. Add any new env vars to `packages/shared/src/env.schema.ts` and
   `.env.example`.
4. Add UI under `apps/web/src/app/(auth)/`.
5. Update
   [`docs-site/concepts/authentication.mdx`](../docs-site/concepts/authentication.mdx)
   so customers know the new method is available.

Do **not** modify `AuthService.resolveContext()` for new auth methods — that
function is method-agnostic and operates on the resolved Better Auth session.

---

## 7. Custom roles or per-org permissions

The default model is fixed roles (`owner`, `admin`, `member`) and a static
permission catalogue. For customer- or tenant-defined roles:

1. Add a `Role` model in `packages/db/prisma/schema.prisma` with `name`,
   `organizationId`, and `permissions String[]`.
2. Update `Member.role` to be a `String?` referencing the new table (or keep the
   legacy field for backwards compatibility and add `customRoleId`).
3. Replace the `hasPermission()` lookup in
   `packages/shared/src/auth/permissions.ts` with a database lookup keyed on the
   active member's role.
4. Cache the role-permission map in Redis with a 60-second TTL.
5. Document the change as an ADR (`docs/decisions/`).

This is a meaningful architectural shift. We don't recommend it unless the
customer base genuinely needs it — most B2B SaaS products do fine with fixed
roles.

---

## 8. Replacing the database

Postgres is a hard dependency for the foreseeable future. We use:

- `pgcrypto` (cuid generation alternative).
- `uuid_generate_v4` if you switch ID strategy.
- JSONB for `Organization.metadata`, `AuditLog.metadata`, etc.
- Prisma's Postgres-specific features (case-insensitive collation, partial
  indexes via raw SQL).

Switching to MySQL or MongoDB is **not** supported. If you're sure you need a
different database engine, you're not the customer wa'kijo was built for —
that's a fair conclusion to reach.

---

## 9. Adding a new locale

The frontend i18n wiring lands in Phase 5.2. Until then:

- Add a translation key to every user-visible string with a `// i18n: <key>`
  comment.
- Centralise English copy in `apps/web/src/lib/copy.en.ts` so the eventual i18n
  migration is mechanical.
- Plan for **right-to-left support** if you intend to ship Arabic, Hebrew, or
  Farsi locales — Tailwind's `dir-rtl` plugin makes this manageable.

---

## 10. Hooking into core events

The recommended pattern for "I want to do something when X happens" is **domain
events** dispatched through BullMQ:

```ts
// In your service:
await this.queue.add('contact.created', { contactId, orgId });

// In a separate processor module under apps/api/src/modules/<your-feature>/processors/:
@Processor('events')
export class YourFeatureEventProcessor {
  @Process('contact.created')
  async onContactCreated(job: Job<{ contactId: string; orgId: string }>) {
    // your custom logic
  }
}
```

This keeps your code in your modules without modifying the core
`ContactsService`. When wa'kijo upgrades change `ContactsService`, your
processor keeps working.

---

## 11. CI customisation

The shipped CI definition (added in Phase 5) runs:

1. `pnpm install`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm test:integration` (with a Postgres service container)
6. `pnpm test:e2e` (with built artifacts)
7. `pnpm build`

To extend CI:

- Add new jobs in **separate workflow files** rather than editing the shipped
  one. Less merge friction on upgrades.
- Pin tool versions (Node, pnpm) explicitly. We pin in `.nvmrc` and via
  `corepack`; mirror this in your CI image.
- Cache `~/.pnpm-store` and `node_modules/.cache` aggressively.

---

## 12. What we recommend keeping in sync with upstream

If you do nothing else, keep these files in sync with upstream wa'kijo releases:

- `apps/api/src/auth/**` — Better Auth wiring evolves with security fixes.
- `apps/api/src/common/**` — guards, interceptors, filters.
- `apps/api/src/base/**` — BaseRepository.
- `packages/db/prisma/schema.prisma` — accept new fields, never drop them.
- `packages/shared/src/auth/**` — permission catalogue.
- `.claude/rules/**` — security and code quality rules.

Modify everything else freely. The upstream diff for a typical wa'kijo release
touches only the files above plus their tests and docs.

---

## 13. Help

When you hit a customisation that doesn't fit the patterns above, check:

1. The relevant ADR in `docs/decisions/` — there may already be a "what if you
   want to deviate" section.
2. The skill files (`anthropic-skills:nestjs-prisma`,
   `anthropic-skills:nestjs-better-auth`) — these capture the patterns the core
   team uses internally.
3. [`SUPPORT.md`](../SUPPORT.md) — if all else fails, file a ticket. We're
   especially interested in customisations that lots of customers want, as they
   often graduate into the boilerplate itself.
