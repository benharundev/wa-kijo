import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@wa-kijo/db';

// Only these models have a deletedAt column. Better Auth models (Session,
// Account, Verification) do not — injecting deletedAt: null into their
// queries would cause a Prisma schema validation error at runtime.
const SOFT_DELETE_MODELS = new Set<string>(['User', 'Organization', 'Contact', 'Conversation']);

// Hard-delete actions that must be redirected to soft delete.
const DELETE_ACTIONS = new Set<Prisma.PrismaAction>(['delete', 'deleteMany']);

// Read actions that must have deletedAt: null injected.
const READ_ACTIONS = new Set<Prisma.PrismaAction>([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
    this.registerMiddleware();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  // Middleware 1: Auto-filter soft-deleted records on reads, for models that
  // have a deletedAt column. Merges into any existing where clause.
  // Middleware 2: Block hard deletes — redirect to soft delete (update deletedAt).
  private registerMiddleware(): void {
    this.$use(async (params, next) => {
      if (params.model && SOFT_DELETE_MODELS.has(params.model)) {
        if (READ_ACTIONS.has(params.action)) {
          params.args ??= {};
          params.args.where = { deletedAt: null, ...(params.args.where ?? {}) };
        }

        if (DELETE_ACTIONS.has(params.action)) {
          const isMany = params.action === 'deleteMany';
          params.action = isMany ? 'updateMany' : 'update';
          params.args = {
            ...params.args,
            data: { deletedAt: new Date() },
          };
        }
      }

      return next(params);
    });
  }
}
