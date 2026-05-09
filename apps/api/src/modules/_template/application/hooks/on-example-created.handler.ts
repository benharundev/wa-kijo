import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ExampleCreatedEvent } from '../../domain/events/example-created.event';

/**
 * Hook handler — subscribes to a domain event from this OR another
 * module. Lives in `application/hooks/` so it's clear this is a
 * cross-module hook subscriber, not a primary use case.
 *
 * The hook contract (event name + payload schema) is the public API
 * for cross-module integration. Customers may install hooks in their
 * own forks; if we change the contract, their hooks break. SemVer
 * the event accordingly.
 *
 * The queue name 'events' matches QUEUE_NAMES.EVENTS in
 * apps/api/src/queues/queue.names.ts (cross-module event bus).
 */
@Injectable()
@Processor('events')
export class OnExampleCreatedHandler extends WorkerHost {
  private readonly logger = new Logger(OnExampleCreatedHandler.name);

  async process(job: Job): Promise<void> {
    if (job.name !== ExampleCreatedEvent.name) return;

    const parse = ExampleCreatedEvent.schema.safeParse(job.data);
    if (!parse.success) {
      this.logger.warn(
        { jobName: job.name, error: parse.error.message },
        'Dropping malformed event payload',
      );
      return;
    }

    const payload = parse.data;
    this.logger.log(
      { exampleId: payload.exampleId, orgId: payload.organizationId },
      'Example created — handler invoked',
    );

    // Real handlers do work here: send notifications, sync to CRM,
    // call an integration, etc. Throw to retry per the BullMQ
    // policy (3 attempts, exponential backoff, then DLQ).
  }
}
