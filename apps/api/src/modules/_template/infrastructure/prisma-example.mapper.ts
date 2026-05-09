import { Example } from '../domain/example.entity';
import { ExampleStatus } from '../domain/value-objects/example-status.vo';

/**
 * Mapper between the persistence shape (Prisma row) and the domain
 * aggregate. Required when the aggregate is a class with methods
 * (per ADR-0009) — the Prisma row alone won't enforce invariants
 * after rehydration.
 *
 * Lives in `infrastructure/` so the domain layer remains free of
 * Prisma imports.
 */
type PrismaExampleRow = {
  id: string;
  organizationId: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
};

export const PrismaExampleMapper = {
  toRow(aggregate: Example): PrismaExampleRow {
    return {
      id: aggregate.id,
      organizationId: aggregate.organizationId,
      title: aggregate.title,
      status: aggregate.status.value,
    };
  },

  toDomain(row: PrismaExampleRow): Example {
    const status =
      row.status === 'draft'
        ? ExampleStatus.draft()
        : row.status === 'published'
          ? ExampleStatus.published()
          : ExampleStatus.archived();
    return Example.rehydrate({
      id: row.id,
      organizationId: row.organizationId,
      title: row.title,
      status,
    });
  },
};
