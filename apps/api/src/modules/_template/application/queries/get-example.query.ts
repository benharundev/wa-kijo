import { Injectable, NotFoundException } from '@nestjs/common';
import type { RequestContext } from '../../../../common/context/request-context';
import { ExampleRepository } from '../../infrastructure/example.repository';
import type { Example } from '../../domain/example.entity';

/**
 * Query = read-only use case. Lives in `application/queries/`.
 * Same shape as a command; just doesn't mutate.
 *
 * Per ADR-0009 we don't split read/write databases — both go through
 * the same repository — but we DO split commands and queries by
 * folder so the read path is obvious.
 */
@Injectable()
export class GetExampleQuery {
  constructor(private readonly repo: ExampleRepository) {}

  async execute(ctx: RequestContext, id: string): Promise<Example> {
    const found = await this.repo.findById(ctx, id);
    if (!found) {
      // Returns 404 (not 403) for cross-tenant — the BaseRepository
      // already filters by ctx.orgId, so a missing record means
      // "doesn't exist OR exists in another org" (indistinguishable).
      throw new NotFoundException('Example not found');
    }
    return found;
  }
}
