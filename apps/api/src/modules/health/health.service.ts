import { Inject, Injectable, Logger } from '@nestjs/common';
import type { HealthResponseDto, ServiceStatus } from '@wa-kijo/shared';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthResponseDto> {
    const [postgresStatus, redisStatus] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const status: ServiceStatus = postgresStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'down';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        postgres: { status: postgresStatus },
        redis: { status: redisStatus },
      },
    };
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`; // EXEMPT: health check system query
      return 'ok';
    } catch (err) {
      this.logger.error({ err }, 'Postgres health check failed');
      return 'down';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'ok' : 'down';
    } catch (err) {
      this.logger.error({ err }, 'Redis health check failed');
      return 'down';
    }
  }
}
