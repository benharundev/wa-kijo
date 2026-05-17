# Server architecture

The deployment topology of a typical wa'kijo install. Two long-running processes
(`apps/api` and `apps/web`), two data stores (Postgres 16 + Redis 7), and three
external SaaS dependencies (Stripe, Resend, Google OAuth). The ports shown are
the local-dev defaults from `.env.example`; production deployments typically
front everything with a reverse proxy on 80/443.

```mermaid
graph TB
    Browser["🌐 Browser<br/>Session cookie (HttpOnly, SameSite=Lax)"]

    subgraph App ["Application processes"]
        direction TB
        Web["Next.js 15 — apps/web<br/>App Router, Server Components<br/>:3001"]
        API["NestJS 11 + Fastify — apps/api<br/>Better Auth + Prisma + BullMQ<br/>:3000"]
    end

    subgraph Data ["Data layer"]
        direction TB
        Postgres[("PostgreSQL 16<br/>tenant-scoped rows<br/>:5434")]
        Redis[("Redis 7<br/>BullMQ queues + DLQ<br/>:6381")]
    end

    subgraph Ext ["External services"]
        direction TB
        Stripe["💳 Stripe<br/>checkout, customer portal, webhooks"]
        Resend["📧 Resend<br/>verification, magic link, invitation"]
        OAuth["🔑 Google OAuth<br/>(optional)"]
    end

    Browser -->|HTTPS REST<br/>credentials: include| Web
    Browser -.->|Stripe-hosted checkout| Stripe
    Web -->|API calls via fetcher<br/>cookie forwarded| API

    API -->|Prisma Client| Postgres
    API <-->|BullMQ producer + worker| Redis
    API <-->|API + webhook signature verify| Stripe
    API -->|transactional email| Resend
    API <-->|/api/auth/* OAuth flow| OAuth

    classDef ext fill:#fff3e0,stroke:#e65100,stroke-width:1.5px
    classDef app fill:#e3f2fd,stroke:#0d47a1,stroke-width:1.5px
    classDef data fill:#e8f5e9,stroke:#1b5e20,stroke-width:1.5px
    classDef client fill:#fff,stroke:#374151,stroke-width:1.5px

    class Stripe,Resend,OAuth ext
    class Web,API app
    class Postgres,Redis data
    class Browser client
```

## Key properties

- **Stateless application processes** — the API and web app hold no session
  state in-process. Sessions are in the Postgres `Session` table (Better Auth)
  and the cookie is the only client-side artifact. You can run N replicas of
  either process behind a load balancer with no sticky sessions required.
- **Postgres is the source of truth for tenancy.** Every row in a tenant-scoped
  table has an `organizationId`. `BaseRepository<T>` enforces filtering by the
  active org from the `AsyncLocalStorage` request context.
- **Redis is ephemeral.** BullMQ stores queue state there; if Redis is wiped,
  in-flight jobs are lost. The DLQ partition keeps terminally failed jobs for
  manual inspection. Use a managed Redis with persistence in production.
- **Stripe is the only payment provider built in.** The `BillingProvider`
  interface is generic so additional providers (Billplz, Curlec, etc.) can be
  plugged in without changing `BillingService`.
- **OAuth is opt-in.** Set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`
  to enable it; absent vars disable the Google sign-in button cleanly.

## Production deployment shape

A minimum-viable production deployment looks like:

```
              ┌──────────────────────────┐
              │  Reverse proxy / CDN     │
              │  (Caddy, nginx, Cloudflare)
              └─────┬───────────┬────────┘
                    │           │
              :3001 │           │ :3000
            ┌───────▼──┐      ┌─▼─────────┐
            │ apps/web │      │ apps/api  │  ← horizontal scale
            └──────────┘      └─┬──────┬──┘
                                │      │
                  ┌─────────────▼─┐  ┌─▼─────────┐
                  │ Postgres 16   │  │ Redis 7   │
                  │ (managed)     │  │ (managed) │
                  └───────────────┘  └───────────┘
```

Recommended platforms: Railway, Fly.io, AWS (ECS Fargate + RDS + ElastiCache),
or self-hosted Docker Compose. See `docs/deployment.md` for per-platform
recipes.
