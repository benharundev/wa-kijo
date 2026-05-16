import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestContext } from '../../../common/context/request-context';
import type { Example } from '../domain/example.entity';
import { PrismaExampleMapper } from './prisma-example.mapper';

interface ExampleRow {
  readonly id: string;
  readonly organizationId: string;
}

type ExampleDelegate = {
  findFirst(args?: { where?: Record<string, unknown> }): Promise<ExampleRow | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    cursor?: Record<string, unknown>;
    take?: number;
    skip?: number;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
  }): Promise<ExampleRow[]>;
  create(args: { data: Record<string, unknown> }): Promise<ExampleRow>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<ExampleRow>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
};

const unimplementedDelegate: ExampleDelegate = {
  findFirst: async () => {
    throw new Error('Template repository delegate must be replaced by a real Prisma delegate');
  },
  findMany: async () => {
    throw new Error('Template repository delegate must be replaced by a real Prisma delegate');
  },
  create: async () => {
    throw new Error('Template repository delegate must be replaced by a real Prisma delegate');
  },
  update: async () => {
    throw new Error('Template repository delegate must be replaced by a real Prisma delegate');
  },
  count: async () => {
    throw new Error('Template repository delegate must be replaced by a real Prisma delegate');
  },
};

/**
 * Persistence adapter. Bridges the domain aggregate (`Example`) and
 * the Prisma row.
 *
 * Pattern from ADR-0005 (BaseRepository pattern + tenant scoping).
 *
 * NOTE: this is a **template** — `prisma.example` is illustrative
 * only. Replace `example` with your actual Prisma model name and
 * implement `save` / `findById` against it.
 */
@Injectable()
export class ExampleRepository extends BaseRepository<
  ExampleRow,
  Record<string, unknown>,
  Record<string, unknown>,
  { id: string },
  ExampleDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, unimplementedDelegate, ExampleRepository.name);
  }

  protected override tenantWhere(ctx: RequestContext): Record<string, unknown> {
    return { organizationId: ctx.orgId };
  }

  // ── Domain-aware methods ────────────────────────────────────────────────

  async save(_ctx: RequestContext, _aggregate: Example): Promise<void> {
    // Real implementation: const row = PrismaExampleMapper.toRow(aggregate);
    //                       this.prisma.example.upsert({ where: { id: row.id }, ... });
    // Use BaseRepository's create/update internally; do not call prisma directly
    // outside the BaseRepository pattern except via // EXEMPT: comments.
    PrismaExampleMapper.toRow; // referenced so importing the mapper isn't unused
  }

  async findExampleById(_ctx: RequestContext, _id: string): Promise<Example | null> {
    // Real implementation:
    //   const row = await BaseRepository.findById -> map via PrismaExampleMapper.toDomain
    return null;
  }
}
