# ADR 0007 — BullMQ on Redis 7 for background jobs

**Date:** 2026-04-15
**Status:** Accepted
**Deciders:** wa-kijo core team

---

## Context

A real B2B SaaS does not handle every request inline. Outbound message
delivery, webhook fan-out, scheduled cleanups, billing reconciliation,
analytics rollups — all of these need to run **asynchronously** with
retries, observability, and a story for what to do when they fail
permanently.

The job system also has to:

- Survive process restarts (jobs persist between deploys).
- Handle bursty inbound webhook traffic without dropping work.
- Provide a per-tenant view so a noisy customer doesn't starve the
  others.
- Have an admin UI for inspecting queues and replaying dead-letter jobs.
- Integrate cleanly with NestJS dependency injection.

---

## Decision

**We use [BullMQ](https://docs.bullmq.io) backed by Redis 7, integrated
via `@nestjs/bullmq`.** Bull-Board is mounted at `/admin/queues` for
administrative inspection (RBAC-gated to platform admins).

Defaults that apply to **every** queue:

- **Retries:** 3 attempts.
- **Backoff:** exponential — 1 s, 5 s, 30 s.
- **Dead-letter handling:** terminally failed jobs persist in a
  per-queue DLQ for manual inspection. Never silently dropped.
- **Removal policy:** completed jobs removed after 24 hours; failed
  jobs after 7 days.
- **Concurrency:** per-queue, configured per processor based on the
  underlying provider's rate limit (e.g. message-dispatch concurrency
  matches Meta's per-tenant tier limit).

Job producers `add()` and return immediately — they never `await` the
result.

---

## Alternatives considered

### pg-boss (Postgres-backed jobs)

- Uses the existing Postgres database; one fewer service to operate.
- **Why rejected:** Performance degrades quickly past a few hundred
  jobs/second. Visibility timeout semantics are awkward. We already need
  Redis for session caching and rate limiting; the marginal cost of
  also running BullMQ on it is zero.

### Inngest / Trigger.dev (managed services)

- Excellent DX, durable execution, scheduling, retries built-in.
- **Why rejected:** External dependency that buyers may not be able to
  use (data residency, sovereignty). They also force a different mental
  model (workflows-as-code) that's more than wa'kijo needs.

### AWS SQS + Lambda

- Robust at scale.
- **Why rejected:** Couples wa'kijo to AWS. Buyers on Railway, Fly, or
  self-hosted VPSes can't use it. The deployment story becomes
  cloud-specific; wa'kijo deliberately stays cloud-agnostic.

### Temporal

- Best-in-class durable execution.
- **Why rejected:** Operational complexity is high (Cassandra or
  Postgres backend, separate worker fleet, complex SDK). Overkill for
  the current scope. Buyers who reach the scale where Temporal makes
  sense can swap in (the BullMQ producer interface is small enough to
  re-target).

### Roll-your-own Redis-backed queue

- Theoretical fit, no library overhead.
- **Why rejected:** Reinventing retry, scheduling, prioritisation, and
  the admin UI is months of work. BullMQ is what most production Node
  shops already use.

---

## Consequences

### Positive

- Battle-tested: BullMQ powers production at thousands of companies.
- Bull-Board admin UI gives ops a working tool from day one.
- `@nestjs/bullmq` plugs into NestJS DI cleanly: `@Processor` classes
  are regular providers.
- Reusing Redis for sessions, rate limiting, and queues amortises the
  operational cost.
- Local dev: `pnpm docker:up` brings Redis 7 along — no extra setup.

### Negative

- One more stateful service to monitor and back up. Redis snapshotting
  + AOF persistence configured (`appendonly yes`) so a restart doesn't
  drop in-flight work.
- BullMQ's API has changed across major versions; we pin to 5.x and
  document the upgrade path.
- Long-running jobs (> 60 seconds) need explicit progress reporting to
  avoid Redis evicting them — we document this in the processor
  template.
- Bull-Board adds a UI dependency that bundles its own React; modest
  bundle weight on the API server. Acceptable.

### Neutral

- Customers who'd prefer to swap to an alternative job system can do so
  by replacing the producer/consumer files — the rest of the codebase
  refers to "events emitted to the queue" abstractly. Documented in
  `customization.md`.

---

## Implementation notes

Queue names are centralised in `apps/api/src/queues/queue.names.ts` so
producers and consumers reference the same string:

```ts
export const QUEUE_NAMES = {
  MESSAGE_DISPATCH: 'message-dispatch',
  EVENTS:           'events',
  WEBHOOKS_INBOUND: 'webhooks-inbound',
  CLEANUP:          'cleanup',
} as const;
```

A typical producer:

```ts
@Injectable()
export class MessagesService {
  constructor(@InjectQueue(QUEUE_NAMES.MESSAGE_DISPATCH) private queue: Queue) {}

  async send(ctx: RequestContext, dto: SendMessageDto) {
    const message = await this.repo.create(ctx, { ...dto, status: 'queued' });
    await this.queue.add('dispatch', { messageId: message.id, orgId: ctx.orgId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return message;
  }
}
```

A typical processor:

```ts
@Processor(QUEUE_NAMES.MESSAGE_DISPATCH)
export class MessageDispatchProcessor extends WorkerHost {
  async process(job: Job<{ messageId: string; orgId: string }>) {
    // do the work; throw to trigger retry
  }
}
```

For the production deployment shape (separate worker process vs inline),
see [`deployment.md`](../deployment.md) § "Architectural shape".

---

## References

- BullMQ: https://docs.bullmq.io
- `@nestjs/bullmq`: https://docs.nestjs.com/techniques/queues
- Bull-Board: https://github.com/felixmosh/bull-board
- Related ADRs: none directly.
