import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EnvService } from '../config/env.service';
import { QUEUE_NAMES } from './queue.names';
import { MessageDispatchProcessor } from './processors/message-dispatch.processor';

/**
 * QueuesModule — BullMQ infrastructure for the entire API.
 *
 * Responsibilities:
 *  - Bootstraps the Redis connection used by all queues (forRootAsync).
 *  - Registers each named queue (forFeature pattern via registerQueue).
 *  - Declares all Processor workers so NestJS wires them into the DI container.
 *  - Exports BullModule so any module that imports QueuesModule can inject a
 *    typed queue via @InjectQueue(QUEUE_NAMES.xxx).
 *
 * Default job options:
 *  - 3 retries with exponential back-off (1 s → ~5 s → ~30 s).
 *  - Completed jobs: keep last 1 000 (audit trail, visible in Bull Board).
 *  - Failed jobs:    keep last 5 000 (DLQ — review in Bull Board before purging).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        connection: {
          host: env.get('REDIS_HOST'),
          port: env.get('REDIS_PORT'),
          password: env.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: { count: 1_000 },
          removeOnFail: { count: 5_000 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.MESSAGE_DISPATCH }),
  ],
  providers: [MessageDispatchProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
