import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { EmailModule } from './modules/email/email.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { QueuesModule } from './queues/queues.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
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

    EmailModule, // @Global() — EmailService injectable everywhere
    AuthModule, // @Global() — BETTER_AUTH token + AuthService injectable everywhere
    HealthModule,
    ContactsModule,
    ConversationsModule,
    QueuesModule,
    BillingModule,
  ],
  providers: [
    // AuthGuard runs first on every route. @Public() skips validation.
    { provide: APP_GUARD, useClass: AuthGuard },
    // PermissionGuard runs after AuthGuard. @RequirePermission() opts in.
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
