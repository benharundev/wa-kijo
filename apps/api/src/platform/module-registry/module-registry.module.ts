import { Global, Module } from '@nestjs/common';
import { ModuleRegistryService } from './module-registry.service';
import { ModuleScanner } from './module-scanner';
import { RequireModuleGuard } from './require-module.guard';
import { ModulesAdminController } from './admin/modules-admin.controller';
import { ModulesAdminService } from './admin/modules-admin.service';

/**
 * `ModuleRegistryModule` — boots the Module Registry runtime
 * (ADR-0008). `@Global` so any feature module can inject the
 * service or apply `@UseGuards(RequireModuleGuard)` without
 * importing this module explicitly.
 *
 * Wiring order in `app.module.ts`:
 *   1. PrismaModule (registry needs DB access)
 *   2. ConfigModule
 *   3. ModuleRegistryModule  ← initialises here, populates Module rows
 *   4. AuthModule + everything else
 *
 * The OnApplicationBootstrap hook runs AFTER all modules' onModuleInit
 * hooks — by then Prisma is ready, env validated.
 */
@Global()
@Module({
  providers: [
    ModuleRegistryService,
    ModuleScanner,
    RequireModuleGuard,
    ModulesAdminService,
  ],
  controllers: [ModulesAdminController],
  exports: [ModuleRegistryService, RequireModuleGuard, ModulesAdminService],
})
export class ModuleRegistryModule {}
