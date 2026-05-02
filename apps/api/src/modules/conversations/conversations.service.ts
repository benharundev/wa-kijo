import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConversationQueryDto,
  CreateConversationDto,
  MessageQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from '@wa-kijo/shared';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from './messages.repository';

/**
 * ConversationsService — business logic for conversation threads and messages.
 *
 * Message sending is intentionally simple for now: the message is persisted
 * with status='queued'. A BullMQ job (Phase 5) will pick it up, forward it
 * to the provider (WhatsApp, email, etc.) and update the status to 'sent'
 * or 'failed' via the provider webhook.
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly convRepo: ConversationsRepository,
    private readonly msgRepo: MessagesRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Conversations ────────────────────────────────────────────────────────────

  async list(ctx: RequestContext, query: ConversationQueryDto) {
    return this.convRepo.search(ctx, query);
  }

  async findOne(ctx: RequestContext, id: string) {
    const conv = await this.convRepo.findByIdWithContact(ctx, id);
    if (!conv) throw new NotFoundException(`Conversation ${id} not found`);
    return conv;
  }

  async create(ctx: RequestContext, dto: CreateConversationDto) {
    // Validate the contact belongs to this tenant
    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, organizationId: ctx.orgId },
    });
    if (!contact) throw new NotFoundException(`Contact ${dto.contactId} not found`);

    // One open conversation per contact per channel
    const existing = await this.prisma.conversation.findFirst({
      where: {
        organizationId: ctx.orgId,
        contactId: dto.contactId,
        channel: dto.channel,
        status: 'open',
      },
    });
    if (existing) {
      throw new ConflictException(
        `An open ${dto.channel} conversation with this contact already exists (id: ${existing.id})`,
      );
    }

    const conv = await this.prisma.conversation.create({
      data: {
        organizationId: ctx.orgId,
        contactId: dto.contactId,
        channel: dto.channel,
        createdBy: ctx.userId,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    this.logger.log({ convId: conv.id, orgId: ctx.orgId }, 'Conversation created');
    return conv;
  }

  async update(ctx: RequestContext, id: string, dto: UpdateConversationDto) {
    await this.findOne(ctx, id);

    const conv = await this.prisma.conversation.update({
      where: { id },
      data: dto,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    this.logger.log({ convId: id, status: dto.status, orgId: ctx.orgId }, 'Conversation updated');
    return conv;
  }

  async remove(ctx: RequestContext, id: string) {
    await this.findOne(ctx, id);

    await this.prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: ctx.userId },
    });

    this.logger.log({ convId: id, orgId: ctx.orgId }, 'Conversation soft-deleted');
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  async listMessages(ctx: RequestContext, conversationId: string, query: MessageQueryDto) {
    // Verify the conversation belongs to this tenant before listing messages
    await this.findOne(ctx, conversationId);
    return this.msgRepo.listForConversation(ctx, conversationId, query);
  }

  async sendMessage(ctx: RequestContext, conversationId: string, dto: SendMessageDto) {
    const conv = await this.findOne(ctx, conversationId);
    if (conv.status === 'closed') {
      throw new ConflictException('Cannot send a message to a closed conversation. Reopen it first.');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          organizationId: ctx.orgId,
          conversationId,
          direction: 'outbound',
          type: dto.type,
          body: dto.body ?? null,
          mediaUrl: dto.mediaUrl ?? null,
          status: 'queued',
          createdBy: ctx.userId,
        },
      });

      // Keep conversation's lastMessageAt in sync
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), status: 'open' },
      });

      return msg;
    });

    this.logger.log(
      { msgId: message.id, convId: conversationId, type: dto.type, orgId: ctx.orgId },
      'Message queued',
    );

    // TODO: enqueue BullMQ job to dispatch to provider (Phase 5)

    return message;
  }
}
