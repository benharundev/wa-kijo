import { Injectable } from '@nestjs/common';
import type { Message, Prisma } from '@wa-kijo/db';
import { BaseRepository } from '../../base/base.repository';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { MessageQueryDto } from '@wa-kijo/shared';

type MessageDelegate = PrismaService['message'];

/**
 * MessagesRepository — tenant-scoped persistence for conversation messages.
 *
 * Messages are immutable once created (no update/delete exposed to clients).
 * organizationId is denormalised on each message row to allow efficient
 * tenant-scoped queries without joining through the conversation table.
 */
@Injectable()
export class MessagesRepository extends BaseRepository<
  Message,
  Prisma.MessageCreateInput,
  Prisma.MessageUpdateInput,
  Prisma.MessageWhereUniqueInput,
  MessageDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.message, MessagesRepository.name);
  }

  protected tenantWhere(ctx: RequestContext): Record<string, unknown> {
    return { organizationId: ctx.orgId };
  }

  /** List messages for a specific conversation with optional direction filter. */
  async listForConversation(
    ctx: RequestContext,
    conversationId: string,
    query: MessageQueryDto,
  ): Promise<{ data: Message[]; nextCursor: string | null; hasMore: boolean }> {
    const take = Math.min(query.take ?? 50, 100);

    const where: Prisma.MessageWhereInput = {
      organizationId: ctx.orgId,
      conversationId,
      ...(query.direction && { direction: query.direction }),
    };

    const results = await this.prisma.message.findMany({
      where,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, take) : results;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? last.id : null;

    return { data, nextCursor, hasMore };
  }

  /**
   * Find a message by provider-assigned externalId within the tenant.
   * Used for idempotent webhook processing.
   */
  async findByExternalId(ctx: RequestContext, externalId: string): Promise<Message | null> {
    return this.prisma.message.findFirst({
      where: { organizationId: ctx.orgId, externalId },
    });
  }

  /** Update delivery status for a message (called by webhook handlers). */
  async updateStatus(id: string, status: string, sentAt?: Date): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data: { status, ...(sentAt && { sentAt }) },
    });
  }
}
