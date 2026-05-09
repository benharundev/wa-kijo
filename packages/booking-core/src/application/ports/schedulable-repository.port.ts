import type { Schedulable } from '../../domain/schedulable.interface';
import type { TimeRange } from '../../domain/time-range.vo';

/**
 * Port: a consumer module implements this in its `infrastructure/`
 * layer (typically extending `BaseRepository<T>`). The kernel reasons
 * over the port; the consumer plugs in real persistence.
 *
 * Why a port: ADR-0010 stipulates the kernel is persistence-agnostic
 * and framework-agnostic. Consumers need to be free to back this
 * with Prisma, an in-memory store (for tests), a remote service, or
 * a fake — without changing kernel code.
 */
export interface SchedulableRepositoryPort {
  /**
   * Return all schedulables on `resourceId` whose range overlaps
   * `range`. The kernel's `ConflictDetectionService` filters terminal
   * states; the port may safely return them.
   */
  findOverlapping(resourceId: string, range: TimeRange): Promise<readonly Schedulable[]>;
}
