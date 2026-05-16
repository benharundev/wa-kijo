export * from './env.schema';
export * from './dto/health.dto';
export * from './dto/contact';
export * from './dto/conversation';
export * from './dto/billing';
export * from './auth';
// platform/* exports (module manifest schema, module admin DTOs) removed
// per ADR-0011 — Module Registry is deferred post-v1.0. They live in
// wa'kijo-pro on the archive/platform-thesis branch.
