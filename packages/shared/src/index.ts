export * from './env.schema';
export * from './dto/health.dto';
export * from './dto/contact';
export * from './dto/conversation';
export * from './dto/billing';
export * from './auth';
// platform/* exports (module manifest schema, module admin DTOs) removed
// per ADR-0011 — the Module Registry was reverted out of v1.0 scope. The
// original source remains in git history if it ever needs to be revived.
