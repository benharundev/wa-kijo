# Deployment

> **Audience:** customers and operators deploying wa'kijo to production.
>
> This guide covers the three supported deployment shapes — managed PaaS
> (Railway), self-hosted VPS with Docker Compose, and cloud-native AWS — plus
> the cross-cutting concerns (environment, database, secrets, scaling, backups,
> observability) that apply regardless of where you run it.

---

## 1. Production checklist

Before going live, every deployment must:

- [ ] Run on **Node 22 LTS** (the same major as local development).
- [ ] Use **Postgres 16** with `pgcrypto` available (used by `gen_random_uuid`).
- [ ] Use **Redis 7** with persistence enabled (`appendonly yes`).
- [ ] Set `NODE_ENV=production`. This disables Swagger UI, enforces secure
      cookies, and changes the default log level.
- [ ] Have a long, random `BETTER_AUTH_SECRET` (32+ bytes, base64).
- [ ] Have `BETTER_AUTH_URL` set to the **public** API URL (no trailing slash).
- [ ] Have `CORS_ORIGIN` set to the **public** web URL.
- [ ] Use a verified `EMAIL_FROM` address in your Resend account.
- [ ] Run `pnpm db:migrate:deploy` before starting the API for the first time
      (and on every deploy thereafter).
- [ ] Have a backup strategy for Postgres (see § 6).
- [ ] Have alerts wired up (Sentry, error rate, queue lag — see
      [`observability.md`](observability.md)).
- [ ] Disable seed data on production (`pnpm db:seed` is for dev only).

---

## 2. Architectural shape

wa'kijo splits cleanly into four runtime components that scale independently:

```
                            ┌──────────────────┐
            HTTPS           │  Load balancer   │
   ────────────────────────▶│  (TLS termination)│
                            └──────┬───────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Web (Next.js)    │      │ API (NestJS)     │      │ Worker (NestJS)  │
│ port 3001        │      │ port 3000        │      │ no inbound port  │
│ stateless        │      │ stateless        │      │ BullMQ consumer  │
└──────────────────┘      └─────────┬────────┘      └─────────┬────────┘
                                    │                         │
                          ┌─────────┴─────────┬───────────────┘
                          ▼                   ▼
                ┌──────────────────┐ ┌──────────────────┐
                │ PostgreSQL 16    │ │ Redis 7          │
                │ + PgBouncer      │ │ persistent       │
                └──────────────────┘ └──────────────────┘
```

**Why split web/API/worker?** Different scaling characteristics. Web is mostly
idle React rendering. API is steady CPU. Worker spikes with message sends and
webhook bursts. Splitting lets you autoscale each independently.

For Phase 4 you can start as a **single API process that also runs the BullMQ
workers** (set `WORKER_MODE=inline`). This is fine for low-traffic deployments.
Split when queue lag becomes a problem (> 5 minutes p95).

---

## 3. Environment variables

The complete list lives in [`.env.example`](../.env.example). Production
deployments need at minimum:

| Variable                                      | Notes                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV=production`                         | Always                                                                                                                                     |
| `DATABASE_URL`                                | Use a PgBouncer URL in transaction pooling mode for the API; direct connection for the worker (long-running jobs need session-level state) |
| `REDIS_URL`                                   | Including password, e.g. `rediss://:password@host:6379`                                                                                    |
| `BETTER_AUTH_SECRET`                          | 32-byte random; rotate quarterly                                                                                                           |
| `BETTER_AUTH_URL`                             | `https://api.your-saas.com`                                                                                                                |
| `CORS_ORIGIN`                                 | `https://app.your-saas.com`                                                                                                                |
| `RESEND_API_KEY`                              | Production key, not test                                                                                                                   |
| `EMAIL_FROM`                                  | Verified domain in Resend                                                                                                                  |
| `SENTRY_DSN`                                  | Strongly recommended                                                                                                                       |
| `LOG_LEVEL`                                   | `info` recommended; `debug` is too noisy in prod                                                                                           |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | If using Stripe                                                                                                                            |
| `BILLPLZ_*`                                   | If using Billplz                                                                                                                           |

> **Never commit `.env`** — production secrets belong in your platform's secret
> manager (Railway environment groups, AWS SSM Parameter Store, HashiCorp Vault,
> Fly Secrets, etc.).

---

## 4. Recipe A — Railway (managed PaaS, recommended for getting started)

Railway is the fastest path from "I bought wa'kijo" to "we're in production". It
handles TLS, deployments from GitHub, environment groups, managed Postgres, and
managed Redis.

### One-time setup

1. Create a Railway project from your private wa'kijo fork.
2. Add three services to the project:
   - **API** — root `apps/api`, build command
     `pnpm install && pnpm build && pnpm --filter @wa-kijo/db migrate:deploy`,
     start command `pnpm --filter @wa-kijo/api start`.
   - **Web** — root `apps/web`, build command `pnpm install && pnpm build`,
     start command `pnpm --filter @wa-kijo/web start`.
   - **Worker** — same as API but start command
     `WORKER_MODE=true pnpm --filter @wa-kijo/api start`. (Phase 5+ once a
     separate worker entrypoint exists; for now reuse the API service with
     `WORKER_MODE=inline`.)
3. Add **Postgres** and **Redis** plugins.
4. Create a **shared environment group** "production" with all the variables
   from § 3.
5. Generate domains: `api.your-saas.com` for the API, `app.your-saas.com` for
   the web. Update `BETTER_AUTH_URL` and `CORS_ORIGIN` accordingly.

### Deploys

`git push origin main` triggers a build. Railway runs `migrate:deploy` before
swapping in the new container.

### Cost guidance

Indicative monthly cost for a small B2B SaaS (≤ 10 paying customers):

| Service                                 | Plan             | $ / month |
| --------------------------------------- | ---------------- | --------- |
| API + Web + Worker (3 services × Hobby) | 0.5 vCPU, 512 MB | ~ $15     |
| Postgres                                | Starter, 1 GB    | ~ $5      |
| Redis                                   | Starter, 0.25 GB | ~ $5      |

You'll outgrow these limits before you outgrow Railway as a platform. Bumping to
Pro plans gets you to a few hundred customers comfortably.

---

## 5. Recipe B — Self-hosted Docker Compose (single VPS)

Best for: cost-sensitive deployments, sovereignty / data residency requirements,
customers who already have ops capacity.

### Prerequisites

- One VPS with at least 4 GB RAM, 2 vCPUs, 40 GB SSD. Ubuntu 24.04 LTS.
- A domain pointed at the VPS IP.
- Docker 25+ with Compose v2.
- A reverse proxy. We recommend [Caddy](https://caddyserver.com/) for automatic
  TLS, or Traefik / nginx if you have a preference.

### Production compose file

A starter `docker-compose.prod.yml` (commit this to your fork — it lives outside
the repo by default to avoid implying we host this for you):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command:
      [
        'redis-server',
        '--appendonly',
        'yes',
        '--requirepass',
        '${REDIS_PASSWORD}',
      ]
    volumes:
      - redis-data:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: always
    env_file: .env.production
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    expose: ['3000']

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: always
    env_file: .env.production
    depends_on: [api]
    expose: ['3001']

  caddy:
    image: caddy:2-alpine
    restart: always
    ports: ['80:80', '443:443']
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config

volumes:
  postgres-data:
  redis-data:
  caddy-data:
  caddy-config:
```

A starter `Caddyfile`:

```
api.your-saas.com {
    reverse_proxy api:3000
}

app.your-saas.com {
    reverse_proxy web:3001
}
```

### Bootstrapping

```bash
# On the VPS, after cloning your fork:
cp .env.example .env.production
# Fill in production secrets, then:
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api pnpm --filter @wa-kijo/db migrate:deploy
```

### Updates

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api pnpm --filter @wa-kijo/db migrate:deploy
```

Wrap the above in a `scripts/deploy.sh` and run it from a CI workflow that SSHes
to the VPS — keeps deploys consistent.

---

## 6. Recipe C — AWS (production-grade, multi-AZ)

For larger deployments where compliance, regional availability, or fine-grained
scaling matters. Indicative architecture:

| Component       | Service                                     | Notes                                                                         |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| API + Worker    | ECS Fargate (2 tasks min, autoscale on CPU) | Separate task definitions for API and worker; share image, different commands |
| Web             | Vercel **or** Amplify **or** ECS Fargate    | Vercel is easiest if you don't need to keep web inside the VPC                |
| Database        | RDS for PostgreSQL 16                       | Multi-AZ, gp3 storage, automated backups, point-in-time restore               |
| Connection pool | RDS Proxy (preferred) or PgBouncer on EC2   | Required at any meaningful scale                                              |
| Cache / queue   | ElastiCache for Redis 7                     | Multi-AZ with automatic failover                                              |
| Email           | Resend (recommended) or SES                 | If using SES, write an `EmailProvider` adapter                                |
| Object storage  | S3                                          | For uploaded files; lifecycle rules for cleanup                               |
| Secrets         | SSM Parameter Store or Secrets Manager      | Read at task startup                                                          |
| Logs            | CloudWatch Logs                             | Pino's JSON output is parsed natively                                         |
| Errors          | Sentry                                      | Send via the SDK; CloudWatch alarms on Sentry's webhook                       |
| CDN             | CloudFront in front of the web ALB          | Caches static assets                                                          |

### IAM minimum policy for the API task role

```jsonc
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:wakijo/*",
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::wakijo-uploads-*/*",
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "*",
    },
  ],
}
```

Do **not** grant the API broad RDS or ElastiCache management permissions — it
only needs to connect via the connection string.

---

## 7. Database operations

### First-time migrations

```bash
pnpm --filter @wa-kijo/db migrate:deploy
```

`migrate:deploy` applies pending migrations only — it never prompts and never
generates new ones (that's `migrate:dev`, which is local-only).

### Connection pooling

Always use **PgBouncer (transaction pooling)** in front of Postgres for the API.
The worker uses a **direct connection** because long-running jobs require
session-level state.

In the Prisma client config, ensure `?pgbouncer=true` is appended to the
`DATABASE_URL` for transaction-pooled connections. This disables prepared
statements that PgBouncer doesn't support.

### Backups

| Cadence                | Mechanism                                            | Retention |
| ---------------------- | ---------------------------------------------------- | --------- |
| Continuous WAL         | RDS automated backups / `pgbackrest` for self-hosted | 30 days   |
| Daily logical dump     | `pg_dump` to S3 / object storage                     | 90 days   |
| Pre-migration snapshot | Take one before every `migrate:deploy` in production | 14 days   |

**Test restores quarterly.** A backup you've never restored from is not a
backup. Restore into a staging environment, run smoke tests, then drop it.

### Migration safety

- New migrations run as part of the deploy. Plan for **migration / app
  compatibility** — the new app version must work with both the old and new
  schemas during a rolling deploy.
- Avoid `DROP COLUMN` in the same release that adds the replacement. Two-step
  it: ship the new column, deploy, backfill, ship the drop in a later release.
- Add indexes `CONCURRENTLY` on large tables. Edit the generated migration file
  to add the keyword (this is the one place where hand-editing a migration is
  acceptable — comment why in the file).

---

## 8. Scaling guidance

| Symptom                        | Likely fix                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| API CPU > 70%                  | Add API replicas; ensure the load balancer balances by least-connections                                |
| API memory creeping up         | Profile with `clinic.js heap-profiler`; check that BullMQ producers aren't accumulating event listeners |
| Postgres CPU > 70%             | Check slow query log; add indexes; consider read replicas for analytics queries                         |
| Postgres connections exhausted | PgBouncer is misconfigured or pool size too low                                                         |
| Queue lag growing              | Add worker replicas; check that jobs aren't blocking on external HTTP                                   |
| Email delivery delays          | Resend rate limits — split into a separate queue with concurrency = 1 if needed                         |

For a deeper performance playbook see [`observability.md`](observability.md).

---

## 9. Rollback procedure

For every deploy, document:

1. The previous container image tag.
2. The migration version _before_ the deploy
   (`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1`).
3. A "downgrade SQL" snippet if the new migration introduced a destructive
   change. (For purely additive migrations, no downgrade is needed.)

To roll back:

1. Re-deploy the previous image tag.
2. **Do not** roll the migration back automatically — Prisma does not generate
   down-migrations. If the schema change is incompatible with the old code, run
   the saved downgrade SQL manually after restoring service.
3. Communicate via the customer status page if the rollback was user-visible.

If the issue is data corruption rather than a code bug, restore from the
pre-migration snapshot (§ 6) instead. Practice this in staging.

---

## 10. Smoke tests after every deploy

A minimum end-to-end smoke pack that should pass within 60 seconds of the new
version going live:

```bash
# 1. Health
curl -f https://api.your-saas.com/api/v1/health

# 2. Auth round trip
curl -f -c /tmp/cookies.txt \
  -X POST https://api.your-saas.com/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_USER\",\"password\":\"$SMOKE_PASS\"}"

# 3. Authenticated read
curl -f -b /tmp/cookies.txt https://api.your-saas.com/api/v1/contacts

# 4. Frontend renders
curl -f -I https://app.your-saas.com/
```

Wire this into a GitHub Actions workflow that runs after every successful deploy
and pings PagerDuty if any step fails.

---

## 11. Disaster recovery

| Scenario                                                 | RTO target                     | RPO target                      |
| -------------------------------------------------------- | ------------------------------ | ------------------------------- |
| Single API replica crash                                 | < 30 s (orchestrator restarts) | 0                               |
| Postgres node failure (Multi-AZ)                         | < 2 min (automatic failover)   | 0                               |
| Postgres complete loss, restore from backup              | < 30 min                       | < 5 min (continuous WAL)        |
| Region outage (cross-region restore)                     | < 4 hours                      | < 15 min (cross-region replica) |
| Ransomware / data corruption (restore from logical dump) | < 4 hours                      | < 24 hours                      |

These are targets, not guarantees. Run a tabletop DR exercise at least once a
year, ideally with a real cross-region restore into a sandbox.

---

## 12. Going further

- [`observability.md`](observability.md) — logging, tracing, metrics, alerts.
- [`upgrade-guide.md`](upgrade-guide.md) — per-release upgrade steps.
- [`customization.md`](customization.md) — branding, swapping providers,
  removing modules you don't need.
- [`.claude/rules/security.md`](../.claude/rules/security.md) — the internal
  security checklist that applies to every change.
