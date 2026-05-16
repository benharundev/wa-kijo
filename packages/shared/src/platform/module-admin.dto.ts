import { z } from 'zod';

/**
 * DTOs for the platform module-admin endpoints
 * (`/api/v1/admin/modules/*`). Reused by the API controller, the
 * frontend admin UI, and integration tests.
 *
 * Per ADR-0008, enable/disable is **per active organisation** — the
 * orgId is read from `RequestContext`, never accepted in the body or
 * path. This keeps a customer admin from accidentally toggling
 * another tenant's modules.
 */

/** Public summary of an installed module (registry snapshot row). */
export const ModuleSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  status: z.enum(['active', 'deprecated', 'retired']),
  installedAt: z.string().datetime(),
});
export type ModuleSummaryDto = z.infer<typeof ModuleSummarySchema>;

/** Per-tenant enablement row. */
export const TenantModuleStateSchema = z.object({
  slug: z.string(),
  enabled: z.boolean(),
  enabledAt: z.string().datetime().nullable(),
  enabledBy: z.string().nullable(),
  /** Frozen snapshot of the tenant's per-module config at read time. */
  config: z.record(z.string(), z.unknown()).nullable(),
});
export type TenantModuleStateDto = z.infer<typeof TenantModuleStateSchema>;

/** Body for `PUT /admin/modules/:slug` — optional config overrides. */
export const EnableModuleSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
});
export type EnableModuleDto = z.infer<typeof EnableModuleSchema>;
