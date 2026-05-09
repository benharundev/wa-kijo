import { Injectable } from '@nestjs/common';
import type { RequestContext } from '../../../../common/context/request-context';
import { Example } from '../../domain/example.entity';
import { ExampleCreatedEvent } from '../../domain/events/example-created.event';
import { ExampleRepository } from '../../infrastructure/example.repository';

/**
 * Use case = application service. Orchestrates the call between
 * domain and infrastructure. Holds NO business rules — those live
 * on the aggregate.
 *
 * The use case is responsible for:
 * 1. Loading aggregates via the repository.
 * 2. Calling aggregate methods (which enforce invariants).
 * 3. Persisting the new state.
 * 4. Publishing domain events AFTER persistence (so we never emit
 *    an event without the corresponding state change).
 */
@Injectable()
export class CreateExampleUseCase {
  constructor(
    private readonly repo: ExampleRepository,
    // private readonly events: DomainEventPublisher,  // wired in real modules
  ) {}

  async execute(ctx: RequestContext, dto: { id: string; title: string }): Promise<Example> {
    const example = Example.create({
      id: dto.id,
      organizationId: ctx.orgId,
      title: dto.title,
    });

    await this.repo.save(ctx, example);

    // await this.events.publish(ExampleCreatedEvent, {
    //   exampleId: example.id,
    //   organizationId: example.organizationId,
    //   title: example.title,
    //   occurredAt: new Date().toISOString(),
    // });

    return example;
  }
}
