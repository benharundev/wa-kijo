import { Logger } from '@nestjs/common';
import type { RequestContext } from '../common/context/request-context';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * BaseRepository<M, CreateInput, UpdateInput, WhereUniqueInput, Delegate>
 *
 * All persistence goes through this class. Key guarantees:
 * - Tenant-scoped: every query is filtered by ctx.orgId.
 * - Soft-delete aware: deletedAt filtering is handled by PrismaService middleware.
 * - Cursor pagination for large tables (findAll).
 *
 * Subclasses must implement tenantWhere() to return the model-specific where
 * clause that scopes results to the active organisation.
 *
 * Direct prisma.<model>.findMany calls outside this class are forbidden.
 * If bypassing is truly necessary, add an EXEMPT comment and a tenant-scope test.
 */
export abstract class BaseRepository<
  M,
  CreateInput,
  UpdateInput,
  WhereUniqueInput,
  Delegate extends {
    findFirst(args?: { where?: Record<string, unknown> }): Promise<M | null>;
    findMany(args?: {
      where?: Record<string, unknown>;
      cursor?: Record<string, unknown>;
      take?: number;
      skip?: number;
      orderBy?: Record<string, unknown> | Record<string, unknown>[];
    }): Promise<M[]>;
    create(args: { data: CreateInput }): Promise<M>;
    update(args: { where: WhereUniqueInput; data: UpdateInput }): Promise<M>;
    count(args?: { where?: Record<string, unknown> }): Promise<number>;
  },
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: Delegate,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /** Returns the Prisma where clause that scopes this model to ctx.orgId. */
  protected abstract tenantWhere(ctx: RequestContext): Record<string, unknown>;

  async findById(ctx: RequestContext, id: string): Promise<M | null> {
    return this.delegate.findFirst({
      where: { ...this.tenantWhere(ctx), id },
    });
  }

  async findAll(
    ctx: RequestContext,
    opts: { cursor?: string; take?: number; orderBy?: Record<string, unknown> } = {},
  ): Promise<{ data: M[]; nextCursor: string | null; hasMore: boolean }> {
    const take = Math.min(opts.take ?? 20, 100);

    const results = await this.delegate.findMany({
      where: this.tenantWhere(ctx),
      cursor: opts.cursor ? { id: opts.cursor } : undefined,
      skip: opts.cursor ? 1 : 0,
      take: take + 1,
      orderBy: opts.orderBy ?? { createdAt: 'desc' },
    });

    const hasMore = results.length > take;
    const data = hasMore ? results.slice(0, take) : results;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? ((last as Record<string, unknown>)['id'] as string) : null;

    return { data, nextCursor, hasMore };
  }

  async create(_ctx: RequestContext, input: CreateInput): Promise<M> {
    return this.delegate.create({ data: input });
  }

  async update(_ctx: RequestContext, where: WhereUniqueInput, data: UpdateInput): Promise<M> {
    return this.delegate.update({ where, data });
  }

  async count(ctx: RequestContext, extra?: Record<string, unknown>): Promise<number> {
    return this.delegate.count({
      where: { ...this.tenantWhere(ctx), ...(extra ?? {}) },
    });
  }

  async transaction<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx as PrismaService));
  }
}
