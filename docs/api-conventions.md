# API conventions

> **Scope:** Every HTTP endpoint exposed by `apps/api`. **Audience:** wa'kijo
> developers writing new endpoints, and buyers integrating client SDKs.

This document is the single source of truth for **how** endpoints are shaped.
It defines URL conventions, response envelopes, error shapes, pagination,
and the expected use of HTTP status codes. The *what* of each endpoint
lives in the OpenAPI snapshot at [`api/openapi.yaml`](api/openapi.yaml) and
the live Swagger UI at `http://localhost:3000/api/docs`.

---

## 1. URL structure

All routes are mounted under `/api/v1`. API versioning happens in the URL
path, not in headers — easier to debug, easier to reverse-proxy.

```
/api/v1/<resource>                         # collection
/api/v1/<resource>/:id                     # single item
/api/v1/<resource>/:id/<sub-resource>      # nested collection
/api/v1/<resource>/:id/<sub-resource>/:id  # nested single item
/api/auth/*                                # Better Auth (handled outside the NestJS pipeline)
/api/v1/health                             # liveness probe (Public, no envelope)
/api/v1/admin/queues/*                     # Bull-Board (RBAC-gated)
/api/docs                                  # Swagger UI (dev only)
/api/docs/json                             # OpenAPI JSON (dev only)
```

### Naming rules

- **Resource paths are plural, lowercase, kebab-case.**
  ✅ `/contacts`, `/api-keys`, `/payment-methods`
  ❌ `/Contact`, `/api_key`, `/paymentMethod`
- **IDs in the path** are the canonical primary key (cuid by default).
- **Verbs are HTTP methods, not URL segments.** Resist the temptation to
  `/contacts/123/archive`. Use `PATCH /contacts/123 { status: "archived" }`.
- **Idempotent operations** use `PUT` or `PATCH`. Non-idempotent operations
  use `POST`.

### When verbs in URLs are unavoidable

Sometimes a domain operation does not map cleanly onto CRUD. Examples:

- `POST /conversations/:id/close` — state transition with side effects
  (archives the conversation, emits `conversation.closed` event).
- `POST /messages/:id/retry` — re-enqueues a failed message dispatch.

Use a sub-resource action **only** when the operation has side effects that
make a `PATCH` semantically wrong. Document the rationale in the controller.

---

## 2. Authentication

| Route prefix | Authentication | How |
|---|---|---|
| `/api/auth/*` | Public ↔ Better Auth handles it | Set `wa-kijo.session_token` cookie on success |
| `/api/v1/health` | Public | `@Public()` decorator |
| `/api/v1/**` (everything else) | Required, session cookie | `AuthGuard` (APP_GUARD #1) |
| `/api/v1/admin/*` | Required + role gate | `AuthGuard` + `@RequirePermission` |

Browsers send the cookie automatically. Server-to-server callers must set
`Cookie: wa-kijo.session_token=...` (or use the upcoming API-key auth in
Phase 7).

CORS is configured at the Fastify hook for `/api/auth/*` and via
`app.enableCors()` for everything else. The default allow-listed origin is
`process.env.CORS_ORIGIN`.

---

## 3. Response envelope

### Success

Every non-`/health`, non-`/api/auth` endpoint wraps the controller's return
value with `TransformInterceptor`:

```jsonc
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": { /* the controller's return value */ },
  "timestamp": "2026-05-02T08:30:00.000Z"
}
```

Choose the status code based on the operation:

| Operation | Status |
|---|---|
| `GET` (single or list) | `200 OK` |
| `POST` creating a resource | `201 Created` |
| `POST` triggering an action with no body | `202 Accepted` |
| `PATCH` / `PUT` | `200 OK` |
| `DELETE` | `204 No Content` (no body) |

> The `204` case bypasses the envelope by definition — there is no response
> body to wrap.

### Error

Errors are caught by `HttpExceptionFilter` and shaped uniformly:

```jsonc
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "success": false,
  "statusCode": 422,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "fieldErrors": {
      "phone": ["Invalid E.164 format"],
      "name":  ["Required"]
    }
  },
  "timestamp": "2026-05-02T08:30:00.000Z",
  "path": "/api/v1/contacts"
}
```

| Field | Always present? | Notes |
|---|---|---|
| `success` | Yes | Always `false` for errors |
| `statusCode` | Yes | Mirrors the HTTP status |
| `error` | Yes | Stable machine-readable code (see § 4) |
| `message` | Yes | Human-readable, English, safe to display |
| `details` | No | Free-form, error-specific (see § 4) |
| `timestamp` | Yes | ISO 8601 UTC |
| `path` | Yes | Request path (no query string) |

> **Internal exception subclasses** (`apps/api/src/common/errors/`) drive the
> `error` code and `details` shape. Don't construct error envelopes by hand
> in controllers — throw a typed exception and let the filter shape it.

---

## 4. Error code catalogue

Stable across releases. New codes are additive; renaming is a breaking
change requiring a CHANGELOG entry under "Changed".

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod schema rejection on body, query, or params |
| `BAD_REQUEST` | 400 | Malformed request that didn't reach Zod (e.g. invalid JSON) |
| `UNAUTHENTICATED` | 401 | Session missing, expired, or invalid |
| `FORBIDDEN` | 403 | Permission check failed (`@RequirePermission`) |
| `NOT_FOUND` | 404 | Resource does not exist within the active organisation |
| `CONFLICT` | 409 | Unique constraint violation, duplicate state transition |
| `RATE_LIMITED` | 429 | Per-IP or per-tenant rate limit hit; `Retry-After` header set |
| `QUOTA_EXCEEDED` | 402 | Tenant has hit a paid-tier limit (e.g. message quota) |
| `INTEGRATION_ERROR` | 502 | Upstream provider (Stripe, WhatsApp, Resend) returned an error |
| `INTERNAL_ERROR` | 500 | Catch-all; the message field will be generic, details elided in prod |

For `VALIDATION_ERROR` the `details.fieldErrors` map is keyed by field path
(dot notation for nested objects):

```json
"details": {
  "fieldErrors": {
    "name": ["Required"],
    "metadata.locale": ["Must be one of: en, ms-MY"]
  }
}
```

---

## 5. Pagination

### Cursor pagination (default)

Used for any endpoint that could return more than a few hundred rows.

**Request:**

```
GET /api/v1/contacts?limit=50&cursor=cmgz1k0g0001abc
```

| Query param | Type | Default | Notes |
|---|---|---|---|
| `limit` | integer | 25 | Max 100. Capped server-side. |
| `cursor` | string | — | Opaque cursor returned by the previous page. |

**Response `data` shape:**

```jsonc
{
  "items": [ /* up to `limit` records */ ],
  "nextCursor": "cmgz1k0g0099def",   // null when no more pages
  "hasMore": true
}
```

The cursor is the primary key of the last item in the page (typically a
cuid). It is stable across writes — adding new items at the head does not
shift the existing pages.

### Offset pagination (admin only)

Used in admin / system endpoints where tables are small and consistency
requirements are relaxed:

```
GET /api/v1/admin/audit-logs?page=3&pageSize=50
```

```jsonc
{
  "items": [ /* records */ ],
  "page": 3,
  "pageSize": 50,
  "totalItems": 1247,
  "totalPages": 25
}
```

Offset pagination is **forbidden on hot endpoints** because `OFFSET N` walks
the index and degrades quickly past 100k rows.

---

## 6. Filtering, sorting, search

Pass filters as flat query-string parameters. Multi-value filters use
comma-separated values.

```
GET /api/v1/contacts?tagIds=cmg1,cmg2&blocked=false&q=Aisha
```

Reserved query parameters across all list endpoints:

| Param | Meaning |
|---|---|
| `q` | Free-text search (definition is endpoint-specific) |
| `sort` | Field name; prefix with `-` for descending (`?sort=-createdAt`) |
| `limit` / `cursor` / `page` / `pageSize` | Pagination (see § 5) |

The complete list of supported filters per endpoint is documented in the
Swagger spec at `/api/docs`.

---

## 7. Idempotency

For operations that the client may safely retry (e.g. creating a contact
during a flaky network), accept an `Idempotency-Key` header:

```
POST /api/v1/contacts
Idempotency-Key: 7f4a9c5e-...
```

The server stores `(idempotency_key, tenant_id) -> response` for 24 hours
and returns the cached response on retry. Implementation lives in
`IdempotencyInterceptor` (Phase 5.2).

Mandatory on:

- Any endpoint that creates a billable resource (messages, invoices).
- Any endpoint exposed to webhook senders.

---

## 8. Tenant scoping

Every authenticated request runs inside an `AsyncLocalStorage` context that
includes `orgId`. **Controllers and services do not pass `orgId` around as a
parameter** — the repository reads it from the context.

This means:

- A `GET /api/v1/contacts` request from a user whose active org is
  `org_acme` returns only contacts where `organizationId = 'org_acme'`.
- A `GET /api/v1/contacts/:id` returns 404 if the contact exists but
  belongs to a different org. **Do not return 403**, which would leak the
  existence of the resource.
- Cross-tenant access attempts are logged as `WARN` with the full request
  context for audit.

The full implementation is in
[`apps/api/src/base/base.repository.ts`](../apps/api/src/base/base.repository.ts).

---

## 9. Versioning and deprecation

- The `v1` in `/api/v1/` represents a **major** API version. Major versions
  are introduced rarely (rough guideline: every 2+ years).
- Breaking changes within `v1` are forbidden. Breaking changes ship as `v2`,
  with `v1` continuing to be served for at least 12 months.
- Non-breaking additions — new optional fields, new endpoints, new error
  codes — ship under the same major version.
- Deprecations are announced via:
  1. The `Deprecation` HTTP response header.
  2. A `Sunset` HTTP response header pointing to the removal date.
  3. A CHANGELOG entry under "Deprecated".
  4. A note in [`upgrade-guide.md`](upgrade-guide.md).

---

## 10. Webhooks (outbound, future)

Phase 7 will add outbound webhooks. Expected shape (subject to ADR):

```jsonc
POST <buyer's URL>
Content-Type: application/json
WaKijo-Signature: t=1714638600,v1=<hex hmac>
WaKijo-Event: contact.created
WaKijo-Delivery: 7f4a9c5e-...

{
  "id": "evt_...",
  "createdAt": "2026-05-02T08:30:00.000Z",
  "type": "contact.created",
  "data": { /* event payload */ }
}
```

Buyers verify the signature using HMAC-SHA256 with the per-endpoint secret
from their webhook settings page.

---

## 11. Inbound webhooks

Already in scope for billing and messaging providers (Stripe, Billplz,
WhatsApp). Each provider has its own controller mounted under
`/api/v1/webhooks/<provider>` and:

1. Reads the raw body via Fastify hook (NestJS body parsing skipped for
   these routes).
2. Verifies the provider's signature header.
3. Returns `200` once the event has been **persisted** (not necessarily
   processed) so the provider stops retrying.
4. Enqueues the event payload to BullMQ for asynchronous processing,
   keyed by the provider's event ID for idempotency.

Reject silently (`400` with empty body) on invalid signatures — verbose
errors help attackers fingerprint the verification logic. See
[`.claude/rules/security.md`](../.claude/rules/security.md) for the rule.

---

## 12. Examples

A complete `curl` of the contacts endpoints — useful when wiring an
integration test or a buyer's first SDK:

```bash
# Sign in, store the cookie
curl -c cookies.txt \
  -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"member@example.com","password":"password123"}'

# List contacts (cookie sent automatically)
curl -b cookies.txt \
  http://localhost:3000/api/v1/contacts?limit=20

# Create a contact
curl -b cookies.txt \
  -X POST http://localhost:3000/api/v1/contacts \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+60123456789","name":"Aisha"}'
```

Browsable interactive examples are available at
`http://localhost:3000/api/docs`.

---

## 13. When to deviate

These conventions exist to make the API predictable. If you have a strong
reason to deviate (e.g. an integration partner mandates a non-standard
shape), document the deviation in:

- The controller comment (`// DEVIATION: <provider> requires <shape> because <reason>`).
- An ADR if the deviation is architectural (e.g. a new auth scheme).

Don't quietly break the pattern.
