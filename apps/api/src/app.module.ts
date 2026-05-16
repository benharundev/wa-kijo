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
import { WalaweModule } from './modules/walawe/walawe.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { EnvService } from './config/env.service';
// Platform layer (ADR-0008) — Module Registry must be imported AFTER
// PrismaModule so its OnApplicationBootstrap hook can upsert the
// `Module` rows from the discovered manifests.
import { ModuleRegistryModule } from './platform/module-registry';
import { RequireModuleGuard } from './platform/module-registry';

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

    // Platform layer (ADR-0008). Imported BEFORE feature modules so
    // their manifests are scanned and registered at boot. The
    // `OnApplicationBootstrap` hook in ModuleRegistryService runs
    // once Nest is fully wired; populates `Module` and retires
    // orphans.
    ModuleRegistryModule,

    EmailModule,          // @Global() — EmailService injectable everywhere
    AuthModule,           // @Global() — BETTER_AUTH token + AuthService injectable everywhere
    HealthModule,
    ContactsModule,
    ConversationsModule,
    QueuesModule,
    BillingModule,
    WalaweModule,
  ],
  providers: [
    // AuthGuard runs first on every route. @Public() skips validation.
    { provide: APP_GUARD, useClass: AuthGuard },
    // PermissionGuard runs after AuthGuard. @RequirePermission() opts in.
    { provide: APP_GUARD, useClass: PermissionGuard },
    // RequireModuleGuard runs after PermissionGuard. @RequireModule()
    // opts in. Returns 404 (not 403) when the active organisation has
    // not enabled the module — see ADR-0008.
    { provide: APP_GUARD, useClass: RequireModuleGuard },
  ],
})
export class AppModule {}
