import { z } from 'zod';

/**
 * Module Manifest schema (ADR-0008).
 *
 * Each business module ships a `module.manifest.ts` whose default
 * export must satisfy this schema. The Module Registry validates
 * every manifest at boot; a malformed manifest is a non-recoverable
 * startup error.
 *
 * Live in `@wa-kijo/shared` so the manifest type is available to
 * tooling (CLI scaffolds, doc generation) without importing from
 * `apps/api`.
 */

// ── Sub-schemas ────────────────────────────────────────────────────────────

const SemverSchema = z.string().regex(
  /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/,
  'Must be a valid SemVer string (e.g. 1.0.0, 0.2.3-beta.1)',
);

const SemverRangeSchema = z.string().min(1); // permissive: ^, ~, x, etc — semver pkg validates at runtime

/** Module slug — kebab-case, must start with a letter. */
const SlugSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'Slug must be kebab-case starting with a letter (e.g. tournament, workshop, contacts)',
  )
  .min(2)
  .max(64);

/** Permission string — `<resource>:<action>`. */
const PermissionSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/,
    'Permission must be of the form "resource:action" (e.g. tournament:create, board:assign)',
  );

/** Hook stability mirrors npm's stability conventions. */
const HookStabilitySchema = z.enum(['experimental', 'stable', 'deprecated']);

const HookDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  stability: HookStabilitySchema.default('experimental'),
  /**
   * Symbol name of the Zod schema describing this hook's payload.
   * The module exports the named symbol from its package surface
   * so subscribers can import it for typed handlers.
   */
  schemaRef: z.string().min(1),
});

const CustomFieldKindSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'enum',
]);

const CustomFieldDefinitionSchema = z.object({
  entity: z.string().min(1),
  slug: SlugSchema,
  type: CustomFieldKindSchema,
  options: z.array(z.string()).optional(), // for enum
  indexed: z.boolean().default(false),
  description: z.string().optional(),
});

const UiSlotDefinitionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
});

// ── Top-level manifest ─────────────────────────────────────────────────────

export const ModuleManifestSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  version: SemverSchema,
  description: z.string().min(1),

  /**
   * Module-to-module / module-to-package dependencies expressed as
   * `{ <name>: <semver-range> }`. Resolved at boot — incompatible
   * pairs prevent startup.
   */
  dependencies: z.record(z.string(), SemverRangeSchema).default({}),

  exposes: z
    .object({
      permissions: z.array(PermissionSchema).default([]),
      hooks: z.array(HookDefinitionSchema).default([]),
      customFields: z.array(CustomFieldDefinitionSchema).default([]),
      uiSlots: z.array(UiSlotDefinitionSchema).default([]),
      routes: z.array(z.string().startsWith('/')).default([]),
    })
    .default({
      permissions: [],
      hooks: [],
      customFields: [],
      uiSlots: [],
      routes: [],
    }),

  /**
   * Per-tenant config schema (Zod-as-JSON-Schema) plus defaults. The
   * registry validates each tenant's `TenantModule.configJson` against
   * this schema before the module's services receive it.
   */
  config: z
    .object({
      schema: z.unknown(),
      defaults: z.record(z.string(), z.unknown()).default({}),
    })
    .default({ schema: {}, defaults: {} }),

  /** Optional lifecycle handler module paths, resolved by the scanner. */
  lifecycle: z
    .object({
      onInstall: z.string().optional(),
      onUpgrade: z.string().optional(),
      onUninstall: z.string().optional(),
    })
    .default({}),
});

export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;
export type ModuleManifestInput = z.input<typeof ModuleManifestSchema>;

export const PERMISSION_REGEX = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
export const SLUG_REGEX = /^[a-z][a-z0-9-]*$/;
