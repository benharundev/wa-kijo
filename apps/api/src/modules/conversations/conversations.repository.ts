import { Injectable } from '@nestjs/common';
import type { Conversation, Prisma } from '@wa-kijo/db';
import { BaseRepository } from '../../base/base.repository';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConversationQueryDto } from '@wa-kijo/shared';

type ConversationDelegate = PrismaService['conversation'];

/**
 * ConversationsRepository — tenant-scoped persistence for conversation threads.
 *
 * The PrismaService soft-delete middleware handles deletedAt filtering automatically.
 * The search() method supports status, contact, channel, and assignment filters
 * beyond what BaseRepository's generic findAll can express.
 */
@Injectable()
export class ConversationsRepository extends BaseRepository<
  Conversation,
  Prisma.ConversationCreateInput,
  Prisma.ConversationUpdateInput,
  Prisma.ConversationWhereUniqueInput,
  ConversationDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.conversation, ConversationsRepository.name);
  }

  protected tenantWhere(ctx: RequestContext): Record<string, unknown> {
    return { organizationId: ctx.orgId };
  }

  /** Filtered, cursor-paginated inbox query. */
  async search(
    ctx: RequestContext,
    query: ConversationQueryDto,
  ): Promise<{ data: Conversation[]; nextCursor: string | null; hasMore: boolean }> {
    const take = Math.min(query.take ?? 20, 100);

    const where: Prisma.ConversationWhereInput = {
      organizationId: ctx.orgId,
      ...(query.status && { status: query.status }),
      ...(query.contactId && { contactId: query.contactId }),
      ...(query.assignedToUserId && { assignedToUserId: query.assignedToUserId }),
      ...(query.channel && { channel: query.channel }),
    };

    const results = await this.prisma.conversation.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: take + 1,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, take) : results;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? last.id : null;

    return { data: data as unknown as Conversation[], nextCursor, hasMore };
  }

  /** Fetch a single conversation with its contact summary. */
  async findByIdWithContact(ctx: RequestContext, id: string) {
    return this.prisma.conversation.findFirst({
      where: { id, organizationId: ctx.orgId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
  }
}
