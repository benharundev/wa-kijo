import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue.names';
import type { MessageDispatchJobData } from '../jobs/message-dispatch.job';

/**
 * MessageDispatchProcessor — BullMQ worker that delivers outbound messages.
 *
 * Phase 5: stub implementation that marks the message as 'sent' and assigns
 * a placeholder externalId. Phase 6 will replace the stub with real provider
 * calls (Meta WhatsApp Business API, SMTP relay, SMS gateway) based on
 * job.data.channel.
 *
 * Retry policy (configured in QueuesModule):
 *   3 attempts with exponential backoff (1s → 5s → 30s).
 *   Failed jobs are moved to DLQ (kept for 5 000 entries) for manual triage.
 */
@Processor(QUEUE_NAMES.MESSAGE_DISPATCH)
export class MessageDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageDispatchProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<MessageDispatchJobData>): Promise<void> {
    const { messageId, conversationId, organizationId, channel } = job.data;

    this.logger.log(
      { jobId: job.id, messageId, conversationId, channel, orgId: organizationId },
      'Processing message dispatch',
    );

    // TODO (Phase 6): Route to provider based on channel:
    //   whatsapp → Meta Cloud API  (POST /messages)
    //   email    → Resend or SMTP relay
    //   sms      → Twilio / AWS SNS
    //
    // On provider success: update status='sent', externalId=<provider message id>, sentAt=now
    // On provider error:   throw Error so BullMQ retries; after max attempts status='failed'

    // Phase 5 stub — simulate a successful dispatch
    const externalId = `stub_${Date.now()}_${String(job.id ?? '')}`;

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'sent',
        externalId,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      { jobId: job.id, messageId, externalId },
      'Message dispatched (stub)',
    );
  }
}
