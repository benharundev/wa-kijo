/**
 * Public surface of the Module Registry (ADR-0008). Other parts of
 * `apps/api/src/` import from here, never from individual files.
 */
export { ModuleRegistryModule } from './module-registry.module';
export { ModuleRegistryService } from './module-registry.service';
export { ModuleScanner } from './module-scanner';
export { RequireModule } from './require-module.decorator';
export { RequireModuleGuard } from './require-module.guard';
export {
  resolveDependencyOrder,
  satisfies,
  DependencyResolutionError,
} from './dependency-resolver';
export { ModulesAdminService } from './admin/modules-admin.service';
export { ModulesAdminController } from './admin/modules-admin.controller';
