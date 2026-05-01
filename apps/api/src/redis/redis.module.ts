import { Global, Logger, Module, type Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvService } from '../config/env.service';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [EnvService],
  useFactory: (env: EnvService): Redis => {
    const logger = new Logger('RedisModule');

    const client = new Redis({
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD'),
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    client.on('connect', () => logger.log('Redis connection established'));
    client.on('error', (err: unknown) => logger.error({ err }, 'Redis error'));

    return client;
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
