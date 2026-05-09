/**
 * Module manifest — read at boot by `ModuleRegistry` (ADR-0008).
 *
 * Each manifest declares slug, version, dependencies on the kernel
 * and on other modules, and what this module *exposes* to the rest
 * of the platform: permissions, hook points, custom-field
 * definitions, UI slots, top-level routes.
 *
 * The schema lives in `@wa-kijo/shared` (`ModuleManifestSchema`).
 * The registry validates this object against the schema at boot;
 * a malformed manifest is a non-recoverable startup error.
 */
export const manifest = {
  slug: 'template',
  name: 'Module Template',
  version: '0.0.0',
  description:
    'Canonical scaffolding for a new wa-kijo business module. Not a real module — skipped by the registry.',
  dependencies: {
    // Declare the kernel range the module is compatible with:
    // '@wa-kijo/booking-core': '^0.1.0',
  },
  exposes: {
    permissions: [
      // 'example:create',
      // 'example:read',
    ],
    hooks: [
      // {
      //   name: 'example.before-create',
      //   schemaRef: 'BeforeCreateExampleSchema',
      //   description: 'Fired immediately before a new Example is persisted.',
      //   stability: 'experimental',
      // },
    ],
    customFields: [
      // {
      //   entity: 'Example',
      //   slug: 'priority',
      //   type: 'string',
      //   indexed: false,
      // },
    ],
    uiSlots: [
      // { id: 'example.detail.sidebar', description: 'Right-rail of the example detail view.' },
    ],
    routes: [
      // '/api/v1/examples',
    ],
  },
  config: {
    // Per-tenant configuration schema. The registry validates each
    // tenant's `TenantModule.configJson` against this schema before
    // the module's services receive it.
    schema: {
      // serialised Zod-as-JSON-schema; emit via `zodToJsonSchema(...)`
    },
    defaults: {},
  },
  lifecycle: {
    // onInstall: './lifecycle/on-install',
    // onUpgrade: './lifecycle/on-upgrade',
    // onUninstall: './lifecycle/on-uninstall',
  },
} as const;
