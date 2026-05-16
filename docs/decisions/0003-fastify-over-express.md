# ADR 0003 — Fastify adapter for NestJS, not Express

**Date:** 2026-04-15 **Status:** Accepted **Deciders:** wa-kijo core team

---

## Context

NestJS supports two HTTP server adapters out of the box: Express (the default)
and Fastify. The choice influences raw throughput, body parsing behaviour, and
the API for request hooks — which matters because Better Auth needs to read the
raw request body **before** NestJS parses it.

wa'kijo targets B2B SaaS workloads with bursty messaging and webhook traffic. We
expect customers to scale to thousands of requests per second on a single API
node before sharding. The HTTP layer's overhead is a real budget item.

---

## Decision

**We use the Fastify adapter (`@nestjs/platform-fastify`) for the API
application.**

Fastify is configured with `logger: false` (Pino is wired separately via
`nestjs-pino`). Two `onRequest` hooks run before the NestJS pipeline:

1. **AsyncLocalStorage initialisation** — wraps the request in a
   `RequestContext` store so guards, services, and repositories can read
   per-request data without prop-drilling.
2. **Better Auth handler** — intercepts `/api/auth/*` and forwards to Better
   Auth's `toNodeHandler`, returning the reply to short-circuit the rest of the
   Fastify lifecycle. CORS for these routes is set directly on `reply.raw`
   because Better Auth writes to the underlying Node ServerResponse.

---

## Alternatives considered

### Express

- NestJS's default and the more widely-known Node HTTP framework.
- Massive middleware ecosystem.
- **Why rejected:**
  - Throughput is materially lower (~30–40% in our microbenchmarks for the
    JSON-parse + JSON-serialise hot path).
  - Express's middleware-first model makes "do something before the body is
    parsed" awkward. Better Auth's raw-body requirement worked but needed a
    custom `body-parser` exclusion route.
  - The middleware ecosystem's value drops when nestjs-zod, Pino, and the Better
    Auth org plugin already cover the common needs.

### Hono

- Fast, modern, web-standards-first.
- **Why rejected:** No first-class NestJS adapter. Choosing Hono means ditching
  NestJS's DI / module / decorator system entirely — a much larger architectural
  change than wa'kijo wants to take on.

### Raw Node.js HTTP

- Maximum control, minimum overhead.
- **Why rejected:** Throws away NestJS, which is the framework customers
  explicitly bought wa'kijo for. Not a serious option.

---

## Consequences

### Positive

- ~2× the request throughput of Express on identical hardware for our typical
  CRUD endpoint (measured with `autocannon` against `/api/v1/contacts` returning
  25 records, no DB).
- Native `onRequest` hook ordering is exactly what Better Auth needs.
- Fastify's built-in JSON schema validation is unused (we use Zod end-to-end)
  but the schema-aware response serialisation is a free performance win.

### Negative

- Some Express-only middleware does not have a Fastify equivalent. In practice
  we have not needed any.
- Customers familiar only with Express face a small learning curve for Fastify's
  plugin and hook API. Documented in `docs/architecture.md`.
- Better Auth's `toNodeHandler` writes directly to `reply.raw`, bypassing
  Fastify's header layer. CORS headers must be set manually inside the hook for
  `/api/auth/*` routes — easy to miss when adding a new auth endpoint.
  Documented in code comments in `apps/api/src/main.ts`.

### Neutral

- `@nestjs/platform-fastify` lags `@nestjs/platform-express` by a few weeks on
  major NestJS releases. We pin to versions where both are released.

---

## Implementation notes

The `bootstrap()` function in `apps/api/src/main.ts` wires this up:

```ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false }),
  { bufferLogs: true },
);

const fastifyInstance = app.getHttpAdapter().getInstance() as FastifyInstance;

// Hook #1 — AsyncLocalStorage
fastifyInstance.addHook('onRequest', (request, _reply, done) => {
  requestContextStorage.run({ requestId: request.id /* ... */ }, done);
});

// Hook #2 — Better Auth on /api/auth/*
fastifyInstance.addHook('onRequest', async (request, reply) => {
  if (request.url?.startsWith('/api/auth/')) {
    /* set CORS headers, then forward to Better Auth */
  }
});
```

For the full code (including OPTIONS preflight handling and the dynamic
`toNodeHandler` import), see `apps/api/src/main.ts`.

---

## References

- Fastify benchmarks: https://www.fastify.io/benchmarks/
- NestJS Fastify adapter: https://docs.nestjs.com/techniques/performance
- Related ADRs: ADR-0001 (Better Auth integration relies on these hooks).
