import { Injectable } from '@nestjs/common';
import type { Contact, Prisma } from '@wa-kijo/db';
import { BaseRepository } from '../../base/base.repository';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';

type ContactDelegate = PrismaService['contact'];

/**
 * ContactsRepository — all contact persistence for the active tenant.
 *
 * tenantWhere() scopes every inherited BaseRepository query to orgId.
 * The PrismaService soft-delete middleware filters deletedAt automatically.
 *
 * Custom methods (search, tagFilter) are added here for query patterns
 * that BaseRepository's generic findAll cannot express.
 */
@Injectable()
export class ContactsRepository extends BaseRepository<
  Contact,
  Prisma.ContactCreateInput,
  Prisma.ContactUpdateInput,
  Prisma.ContactWhereUniqueInput,
  ContactDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.contact, ContactsRepository.name);
  }

  protected tenantWhere(ctx: RequestContext): Record<string, unknown> {
    return { organizationId: ctx.orgId };
  }

  /**
   * Full-text search across name and phone, with optional tag and isBlocked filters.
   * Returns a cursor-paginated result set.
   */
  async search(
    ctx: RequestContext,
    opts: {
      cursor?: string;
      take?: number;
      search?: string;
      tagId?: string;
      isBlocked?: boolean;
    } = {},
  ): Promise<{ data: Contact[]; nextCursor: string | null; hasMore: boolean }> {
    const take = Math.min(opts.take ?? 20, 100);

    const where: Prisma.ContactWhereInput = {
      organizationId: ctx.orgId,
      ...(opts.isBlocked !== undefined && { isBlocked: opts.isBlocked }),
      ...(opts.search && {
        OR: [
          { name: { contains: opts.search, mode: 'insensitive' } },
          { phone: { contains: opts.search } },
          { email: { contains: opts.search, mode: 'insensitive' } },
        ],
      }),
      ...(opts.tagId && {
        tags: { some: { tagId: opts.tagId } },
      }),
    };

    const results = await this.prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      cursor: opts.cursor ? { id: opts.cursor } : undefined,
      skip: opts.cursor ? 1 : 0,
      take: take + 1,
      orderBy: { name: 'asc' },
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, take) : results;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? last.id : null;

    return { data: data as unknown as Contact[], nextCursor, hasMore };
  }

  /** Fetch a single contact with its tags. */
  async findByIdWithTags(
    ctx: RequestContext,
    id: string,
  ): Promise<
    | (Contact & { tags: { tag: { id: string; name: string; color: string; slug: string } }[] })
    | null
  > {
    return this.prisma.contact.findFirst({
      where: { id, organizationId: ctx.orgId },
      include: { tags: { include: { tag: true } } },
    });
  }

  /** Find a contact by phone number within the tenant. */
  async findByPhone(ctx: RequestContext, phone: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: { organizationId: ctx.orgId, phone },
    });
  }
}
