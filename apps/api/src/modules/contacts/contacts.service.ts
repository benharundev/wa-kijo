import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
  CreateTagDto,
  UpdateTagDto,
} from '@wa-kijo/shared';
import type { RequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { ContactsRepository } from './contacts.repository';

/**
 * ContactsService — business logic for contacts and tags.
 *
 * All mutations accept a RequestContext so they can record createdBy/updatedBy.
 * Tenant isolation is enforced at the repository layer via BaseRepository.
 */
@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly repo: ContactsRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ── Contacts ────────────────────────────────────────────────────────────────

  async list(ctx: RequestContext, query: ContactQueryDto) {
    return this.repo.search(ctx, {
      cursor:    query.cursor,
      take:      query.take,
      search:    query.search,
      tagId:     query.tagId,
      isBlocked: query.isBlocked,
    });
  }

  async findOne(ctx: RequestContext, id: string) {
    const contact = await this.repo.findByIdWithTags(ctx, id);
    if (!contact) throw new NotFoundException(`Contact ${id} not found`);
    return contact;
  }

  async create(ctx: RequestContext, dto: CreateContactDto) {
    const existing = await this.repo.findByPhone(ctx, dto.phone);
    if (existing) {
      throw new ConflictException(
        `A contact with phone ${dto.phone} already exists in this organisation`,
      );
    }

    const { tagIds, ...rest } = dto;

    const contact = await this.prisma.contact.create({
      data: {
        ...rest,
        organizationId: ctx.orgId,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        tags: tagIds.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    this.logger.log({ contactId: contact.id, orgId: ctx.orgId }, 'Contact created');
    return contact;
  }

  async update(ctx: RequestContext, id: string, dto: UpdateContactDto) {
    await this.findOne(ctx, id); // throws 404 if not found / wrong tenant

    const { tagIds, ...rest } = dto;

    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        updatedBy: ctx.userId,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
    });

    this.logger.log({ contactId: id, orgId: ctx.orgId }, 'Contact updated');
    return contact;
  }

  async remove(ctx: RequestContext, id: string) {
    await this.findOne(ctx, id);

    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: ctx.userId },
    });

    this.logger.log({ contactId: id, orgId: ctx.orgId }, 'Contact soft-deleted');
  }

  // ── Tags ────────────────────────────────────────────────────────────────────

  async listTags(ctx: RequestContext) {
    return this.prisma.tag.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(ctx: RequestContext, dto: CreateTagDto) {
    const slug = this.toSlug(dto.name);

    const existing = await this.prisma.tag.findUnique({
      where: { organizationId_slug: { organizationId: ctx.orgId, slug } },
    });
    if (existing) {
      throw new ConflictException(`A tag with name "${dto.name}" already exists`);
    }

    return this.prisma.tag.create({
      data: { ...dto, slug, organizationId: ctx.orgId },
    });
  }

  async updateTag(ctx: RequestContext, id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: ctx.orgId },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) data['slug'] = this.toSlug(dto.name);

    return this.prisma.tag.update({ where: { id }, data });
  }

  async removeTag(ctx: RequestContext, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: ctx.orgId },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);

    await this.prisma.tag.delete({ where: { id } });
    this.logger.log({ tagId: id, orgId: ctx.orgId }, 'Tag deleted');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
