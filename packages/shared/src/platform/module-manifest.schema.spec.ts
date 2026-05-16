import { describe, it, expect } from 'vitest';
import { ModuleManifestSchema } from './module-manifest.schema';

const minimal = {
  slug: 'tournament',
  name: 'Tournament',
  version: '0.1.0',
  description: 'Chess tournament management for wa\'lawe.',
};

describe('ModuleManifestSchema', () => {
  it('accepts a minimal manifest and applies defaults', () => {
    const parsed = ModuleManifestSchema.parse(minimal);
    expect(parsed.slug).toBe('tournament');
    expect(parsed.dependencies).toEqual({});
    expect(parsed.exposes.permissions).toEqual([]);
    expect(parsed.exposes.hooks).toEqual([]);
  });

  it('rejects a slug with capitals', () => {
    expect(() =>
      ModuleManifestSchema.parse({ ...minimal, slug: 'Tournament' }),
    ).toThrow(/kebab-case/i);
  });

  it('rejects a slug starting with a digit', () => {
    expect(() =>
      ModuleManifestSchema.parse({ ...minimal, slug: '1tournament' }),
    ).toThrow();
  });

  it('rejects a non-semver version', () => {
    expect(() => ModuleManifestSchema.parse({ ...minimal, version: 'v1' })).toThrow();
  });

  it('accepts pre-release semver versions', () => {
    expect(() =>
      ModuleManifestSchema.parse({ ...minimal, version: '0.1.0-beta.1' }),
    ).not.toThrow();
  });

  it('rejects a malformed permission string', () => {
    expect(() =>
      ModuleManifestSchema.parse({
        ...minimal,
        exposes: { permissions: ['NotValid'] },
      }),
    ).toThrow();
  });

  it('accepts well-formed permissions', () => {
    const parsed = ModuleManifestSchema.parse({
      ...minimal,
      exposes: { permissions: ['tournament:create', 'pairing:assign'] },
    });
    expect(parsed.exposes.permissions).toHaveLength(2);
  });

  it('rejects routes that do not start with /', () => {
    expect(() =>
      ModuleManifestSchema.parse({
        ...minimal,
        exposes: { routes: ['api/v1/tournaments'] },
      }),
    ).toThrow();
  });

  it('accepts routes that start with /', () => {
    const parsed = ModuleManifestSchema.parse({
      ...minimal,
      exposes: { routes: ['/api/v1/tournaments'] },
    });
    expect(parsed.exposes.routes).toEqual(['/api/v1/tournaments']);
  });

  it('captures hook definitions with stability default of experimental', () => {
    const parsed = ModuleManifestSchema.parse({
      ...minimal,
      exposes: {
        hooks: [
          {
            name: 'tournament.before-pair',
            description: 'Fires before a round is paired.',
            schemaRef: 'BeforePairPayloadSchema',
          },
        ],
      },
    });
    expect(parsed.exposes.hooks.at(0)?.stability).toBe('experimental');
  });

  it('captures dependencies on the kernel and other modules', () => {
    const parsed = ModuleManifestSchema.parse({
      ...minimal,
      dependencies: {
        '@wa-kijo/booking-core': '^0.1.0',
        contacts: '^0.5.0',
      },
    });
    expect(parsed.dependencies['@wa-kijo/booking-core']).toBe('^0.1.0');
  });
});
