import { Module } from '@nestjs/common';
import { CreateExampleUseCase } from '../application/commands/create-example.usecase';
import { GetExampleQuery } from '../application/queries/get-example.query';
import { ExamplePolicy } from '../application/policies/example.policy';
import { OnExampleCreatedHandler } from '../application/hooks/on-example-created.handler';
import { ExampleRepository } from '../infrastructure/example.repository';
import { ExampleController } from './example.controller';

/**
 * NestJS wiring. Lives in `presentation/` because it sits at the
 * adapter boundary (it knows about controllers and processors).
 *
 * Note the underscore prefix — this template module is excluded from
 * Module Registry scanning (the scanner skips slugs starting with
 * `_`). Real modules name their NestJS module after the slug, e.g.
 * `tournament.module.ts`.
 */
@Module({
  controllers: [ExampleController],
  providers: [
    CreateExampleUseCase,
    GetExampleQuery,
    ExamplePolicy,
    OnExampleCreatedHandler,
    ExampleRepository,
  ],
  exports: [CreateExampleUseCase, GetExampleQuery, ExamplePolicy],
})
export class TemplateModule {}
