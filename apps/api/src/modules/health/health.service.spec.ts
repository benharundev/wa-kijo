import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: ReturnType<typeof vi.fn> };
  let redis: { ping: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redis = { ping: vi.fn().mockResolvedValue('PONG') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('returns status ok when both services are healthy', async () => {
    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.services.postgres.status).toBe('ok');
    expect(result.services.redis.status).toBe('ok');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns status down when postgres is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await service.check();

    expect(result.status).toBe('down');
    expect(result.services.postgres.status).toBe('down');
    expect(result.services.redis.status).toBe('ok');
  });

  it('returns status down when redis is unreachable', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.check();

    expect(result.status).toBe('down');
    expect(result.services.redis.status).toBe('down');
    expect(result.services.postgres.status).toBe('ok');
  });
});
