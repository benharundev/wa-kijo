import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { EnvService } from './config/env.service';

@Module({
  imports: [
    // ConfigModule is @Global() — EnvService is injectable everywhere after this
    ConfigModule,

    LoggerModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        pinoHttp: {
          level: env.get('LOG_LEVEL'),
          transport:
            env.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          autoLogging: true,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          serializers: {
            req: (req: { method: string; url: string; id: string }) => ({
              method: req.method,
              url: req.url,
              id: req.id,
            }),
          },
        },
      }),
    }),

    PrismaModule,
    RedisModule,
    HealthModule,
  ],
})
export class AppModule {}
