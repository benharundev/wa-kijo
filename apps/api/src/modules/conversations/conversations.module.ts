import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from './messages.repository';
import { QueuesModule } from '../../queues/queues.module';
import { QUEUE_NAMES } from '../../queues/queue.names';

@Module({
  imports: [
    QueuesModule,
    // Re-register the queue here so ConversationsService can @InjectQueue it.
    // QueuesModule has already called forRootAsync (Redis connection); this
    // registerQueue call just creates the typed provider for this module scope.
    BullModule.registerQueue({ name: QUEUE_NAMES.MESSAGE_DISPATCH }),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, MessagesRepository],
  exports: [ConversationsService],
})
export class ConversationsModule {}
