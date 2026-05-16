# Runbook

Day-to-day operational reference for wa'kijo developers.

---

## Local development setup

### First time

```bash
# 1. Switch to Node 22 (project requirement)
nvm install 22 && nvm use 22

# 2. Enable pnpm via corepack
corepack enable && corepack prepare pnpm@9.15.0 --activate

# 3. Install dependencies (also runs prisma generate via postinstall)
pnpm install

# 4. Copy environment template
cp .env.example .env
# Fill in BETTER_AUTH_SECRET, RESEND_API_KEY, and EMAIL_FROM at minimum

# 5. Start infrastructure
pnpm docker:up

# 6. Run database migrations
pnpm db:migrate
# When prompted for a migration name, enter: init_schema

# 7. Seed dev data
pnpm db:seed

# 8. Start dev servers
pnpm dev
```

### Daily workflow

```bash
pnpm docker:up    # ensure Postgres + Redis are running
pnpm dev          # start api (port 3000) + web (port 3001)
```

If a previous session left processes on the ports:

```bash
lsof -ti :3000 :3001 | xargs kill -9
pnpm dev
```

---

## Environment variables

| Variable                  | Required | Default                 | Notes                                                       |
| ------------------------- | -------- | ----------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                | No       | `development`           | `production` disables Swagger UI and enables secure cookies |
| `PORT`                    | No       | `3000`                  | API port                                                    |
| `API_PREFIX`              | No       | `api/v1`                | URL prefix for all NestJS routes                            |
| `DATABASE_URL`            | **Yes**  | —                       | Full Postgres connection string                             |
| `REDIS_HOST`              | No       | `localhost`             |                                                             |
| `REDIS_PORT`              | No       | `6379`                  | Docker default is `6381` — see `.env.example`               |
| `REDIS_PASSWORD`          | No       | —                       | Required in production                                      |
| `CORS_ORIGIN`             | No       | `http://localhost:3001` | Frontend URL                                                |
| `LOG_LEVEL`               | No       | `debug`                 | `fatal \| error \| warn \| info \| debug \| trace`          |
| `SENTRY_DSN`              | No       | —                       | Error tracking; omit to disable                             |
| `BETTER_AUTH_SECRET`      | **Yes**  | —                       | Min 32 chars — `openssl rand -base64 32`                    |
| `BETTER_AUTH_URL`         | **Yes**  | —                       | API base URL (no trailing slash)                            |
| `RESEND_API_KEY`          | **Yes**  | —                       | `re_...` — from resend.com                                  |
| `EMAIL_FROM`              | **Yes**  | —                       | Verified sender address                                     |
| `GOOGLE_CLIENT_ID`        | No       | —                       | Google OAuth — omit to disable                              |
| `GOOGLE_CLIENT_SECRET`    | No       | —                       |                                                             |
| `STRIPE_SECRET_KEY`       | No       | —                       | Billing — omit to disable                                   |
| `STRIPE_WEBHOOK_SECRET`   | No       | —                       |                                                             |
| `STRIPE_PUBLISHABLE_KEY`  | No       | —                       |                                                             |
| `BILLPLZ_API_KEY`         | No       | —                       | Malaysian billing — omit to disable                         |
| `BILLPLZ_X_SIGNATURE_KEY` | No       | —                       |                                                             |
| `BILLPLZ_COLLECTION_ID`   | No       | —                       |                                                             |

---

## Database

### Running migrations

```bash
pnpm db:migrate
# Prisma prompts for a migration name — use snake_case (e.g. add_contacts_table)
```

> Never hand-edit migration files. If a migration goes wrong, roll it back and
> re-generate.

### Generating the Prisma client after schema changes

```bash
# This runs automatically as part of pnpm install (postinstall hook)
# Run manually after editing schema.prisma while dev is running:
pnpm --filter @wa-kijo/db generate
```

### Viewing and editing data

```bash
pnpm db:studio      # opens Prisma Studio at http://localhost:5555
```

### Resetting the dev database

```bash
pnpm docker:down
docker volume rm wa-kijo_postgres-data
pnpm docker:up
pnpm db:migrate
pnpm db:seed
```

### Connecting directly to Postgres

```bash
docker exec -it wa-kijo-postgres psql -U wakijo -d wakijo
```

---

## Seed data

```bash
pnpm db:seed
```

Creates (idempotent — safe to re-run):

| User                             | Role   | Org                                        |
| -------------------------------- | ------ | ------------------------------------------ |
| admin@example.com / password123  | owner  | wa'kijo HQ (SYSTEM) + Acme Agency (AGENCY) |
| agency@example.com / password123 | owner  | Acme Agency (AGENCY)                       |
| member@example.com / password123 | member | Acme Workspace (WORKSPACE)                 |

Org hierarchy: `wa'kijo HQ → Acme Agency → Acme Workspace`

---

## Docker

```bash
pnpm docker:up      # start Postgres 16 + Redis 7 (detached)
pnpm docker:down    # stop and remove containers (data volumes preserved)
pnpm docker:logs    # tail all container logs

# Check container health
docker compose -f docker-compose.dev.yml ps

# Restart a single service
docker compose -f docker-compose.dev.yml restart postgres
docker compose -f docker-compose.dev.yml restart redis
```

Default ports (configured to avoid conflicts with local services):

| Service    | Port |
| ---------- | ---- |
| PostgreSQL | 5434 |
| Redis      | 6381 |

---

## Testing

### Unit tests

```bash
pnpm test
# or for a single file:
pnpm --filter @wa-kijo/api test -- --run src/modules/contacts/contacts.service.spec.ts
```

### Integration tests

Require Docker. Each suite spins up its own Postgres container via
Testcontainers. Runs serially — do not parallelise.

```bash
pnpm test:integration
```

### End-to-end tests

Playwright automatically starts the API and web servers before running. Make
sure ports 3000 and 3001 are free.

```bash
pnpm test:e2e

# Skip auto-server-start (if servers are already running):
WEB_SKIP_WEBSERVER=1 pnpm test:e2e

# Run a specific test file:
pnpm --filter @wa-kijo/web test:e2e -- tests/e2e/sign-in.spec.ts
```

### Coverage targets

| Area                            | Minimum           |
| ------------------------------- | ----------------- |
| Auth, billing, tenant isolation | 80% line coverage |
| Everything else                 | 60% line coverage |

---

## Adding a new API module

1. **Schema** — add the Prisma model to `packages/db/prisma/schema.prisma`
2. **Migrate** — `pnpm db:migrate` (name the migration descriptively)
3. **DTO** — create `packages/shared/src/dto/<feature>.ts` with Zod schema +
   type
4. **Build shared** — `pnpm --filter @wa-kijo/shared build`
5. **Scaffold module** — create under `apps/api/src/modules/<feature>/`:
   - `<feature>.module.ts`
   - `<feature>.controller.ts` — routes, `@ApiTags`, `@RequirePermission`
   - `<feature>.service.ts` — business logic
   - `<feature>.repository.ts` — extends `BaseRepository<T>`
   - `<feature>.service.spec.ts` — unit tests
6. **Register** — import the module in `apps/api/src/app.module.ts`
7. **Permission** — if the feature needs new permissions, add them to
   `packages/shared/src/auth/permissions.ts`
8. **ADR** — if this is an architectural decision, document it in
   `docs/decisions/NNNN-title.md`

---

## Swagger UI

Available at `http://localhost:3000/api/docs` in development.

- **JSON spec:** `http://localhost:3000/api/docs/json`
- Disabled automatically in production (`NODE_ENV=production`)
- Cookie auth (`wa-kijo.session_token`) is pre-configured — sign in via the web
  app, then use the Authorize button in Swagger

---

## Common issues

### Port already in use

```bash
lsof -ti :3000 | xargs kill -9   # API
lsof -ti :3001 | xargs kill -9   # Web
```

### Prisma client out of date

```bash
pnpm --filter @wa-kijo/db generate
```

### Shared package changes not reflected in API

The API resolves `@wa-kijo/shared` and `@wa-kijo/db` from compiled `dist/`.
After editing either package:

```bash
pnpm --filter @wa-kijo/shared build
# or
pnpm --filter @wa-kijo/db build
```

### Email not sending

1. Check `RESEND_API_KEY` is set and starts with `re_`
2. Check `EMAIL_FROM` is a verified sender in your Resend account
3. In dev, temporarily set `requireEmailVerification: false` in
   `apps/api/src/auth/auth.module.ts` to bypass the flow, then re-enable

### Sign-in returns 401

Email address not verified. Either:

- Click the link in the verification email
- Manually set `emailVerified = true` in Prisma Studio
- Re-run `pnpm db:seed` (seed users are created with `emailVerified: true`)

### Node engine warning

```
WARN Unsupported engine: wanted: {"node":">=22.0.0"}
```

Switch to Node 22: `nvm use 22`. The warning is cosmetic — the app runs on v20,
but v22 is required for production.

---

## Useful one-liners

```bash
# Generate a secure BETTER_AUTH_SECRET
openssl rand -base64 32

# Check which process is using a port
lsof -i :3000

# Tail API logs only
pnpm docker:logs 2>&1 | grep "apps/api"

# List all DB tables
docker exec -it wa-kijo-postgres psql -U wakijo -d wakijo -c '\dt'

# Count rows in a table
docker exec -it wa-kijo-postgres psql -U wakijo -d wakijo -c 'SELECT COUNT(*) FROM "user";'
```
