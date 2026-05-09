import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RequestContext } from '../../../common/context/request-context';
import type { Example } from '../domain/example.entity';
import { PrismaExampleMapper } from './prisma-example.mapper';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ExampleRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model(): string {
    return 'example';
  }

  protected tenantWhere(ctx: RequestContext): Record<string, unknown> {
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

  async findById(_ctx: RequestContext, _id: string): Promise<Example | null> {
    // Real implementation:
    //   const row = await BaseRepository.findById -> map via PrismaExampleMapper.toDomain
    return null;
  }
}
