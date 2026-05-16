import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ModulesAdminService } from './modules-admin.service';
import type { RequestContext } from '../../../common/context/request-context';
import type { ModuleManifest } from '@wa-kijo/shared';

const ctx: RequestContext = {
  requestId: 'req_test',
  userId: 'user_a',
  orgId: 'org_a',
  orgType: 'WORKSPACE',
  userRole: 'owner',
  globalRole: 'user',
};

const m = (slug: string, deps: Record<string, string> = {}): ModuleManifest =>
  ({
    slug,
    name: slug,
    version: '1.0.0',
    description: `${slug}`,
    dependencies: deps,
    exposes: { permissions: [], hooks: [], customFields: [], uiSlots: [], routes: [] },
    config: { schema: {}, defaults: {} },
    lifecycle: {},
  }) as ModuleManifest;

describe('ModulesAdminService', () => {
  let prisma: any;
  let registry: any;
  let svc: ModulesAdminService;

  beforeEach(() => {
    prisma = {
      tenantModule: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockImplementation(({ create, update }) =>
          Promise.resolve({
            organizationId: ctx.orgId,
            moduleId: 'm_id',
            ...create,
            ...update,
            enabledAt: update?.enabledAt ?? create?.enabledAt ?? null,
            configJson: update?.configJson ?? create?.configJson ?? null,
          }),
        ),
      },
      module: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'm_contacts', slug: 'contacts' },
          { id: 'm_conversations', slug: 'conversations' },
          { id: 'm_workshop', slug: 'workshop' },
        ]),
      },
    };
    registry = {
      list: vi.fn().mockReturnValue([
        m('contacts'),
        m('conversations', { contacts: '^1.0.0' }),
        m('workshop'),
      ]),
      get: vi.fn((slug: string) => {
        return registry.list().find((x: ModuleManifest) => x.slug === slug) ?? null;
      }),
      isEnabled: vi.fn().mockResolvedValue(false),
    };
    svc = new ModulesAdminService(prisma, registry);
  });

  describe('enable', () => {
    it('rejects an unknown slug with 404', async () => {
      await expect(svc.enable(ctx, 'ghost', {})).rejects.toThrow(NotFoundException);
    });

    it('refuses to enable a module whose internal dependencies are disabled', async () => {
      await svc.ensureLookupCache();
      registry.isEnabled.mockImplementation(async (_orgId: string, slug: string) => {
        return slug === 'contacts' ? false : false;
      });

      try {
        await svc.enable(ctx, 'conversations', {});
        expect.fail('should have thrown ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        const details = response.details as { missingDependencies: string[] };
        expect(details.missingDependencies).toEqual(['contacts']);
      }
    });

    it('enables a module with no internal dependencies', async () => {
      await svc.ensureLookupCache();
      const out = await svc.enable(ctx, 'workshop', {});
      expect(out.slug).toBe('workshop');
      expect(out.enabled).toBe(true);
      expect(prisma.tenantModule.upsert).toHaveBeenCalledOnce();
    });

    it('enables a dependent module once its dependency is enabled', async () => {
      await svc.ensureLookupCache();
      registry.isEnabled.mockImplementation(async (_orgId: string, slug: string) => {
        return slug === 'contacts';
      });
      const out = await svc.enable(ctx, 'conversations', {});
      expect(out.slug).toBe('conversations');
      expect(out.enabled).toBe(true);
    });
  });

  describe('disable', () => {
    it('rejects an unknown slug with 404', async () => {
      await expect(svc.disable(ctx, 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('refuses to disable a module that other enabled modules depend on', async () => {
      await svc.ensureLookupCache();
      registry.isEnabled.mockImplementation(async (_orgId: string, slug: string) => {
        return slug === 'conversations';
      });

      try {
        await svc.disable(ctx, 'contacts');
        expect.fail('should have thrown ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        const details = response.details as { dependents: string[] };
        expect(details.dependents).toContain('conversations');
      }
    });

    it('disables when no other enabled module depends on it', async () => {
      await svc.ensureLookupCache();
      registry.isEnabled.mockResolvedValue(false);
      await expect(svc.disable(ctx, 'contacts')).resolves.toBeUndefined();
      expect(prisma.tenantModule.upsert).toHaveBeenCalledOnce();
    });
  });

  describe('listForActiveOrg', () => {
    it('returns one row per installed module, defaulting to disabled', async () => {
      await svc.ensureLookupCache();
      const rows = await svc.listForActiveOrg(ctx);
      expect(rows.map((r) => r.slug)).toEqual(['contacts', 'conversations', 'workshop']);
      expect(rows.every((r) => r.enabled === false)).toBe(true);
    });

    it('reflects enabled rows from the database', async () => {
      await svc.ensureLookupCache();
      prisma.tenantModule.findMany.mockResolvedValue([
        {
          organizationId: ctx.orgId,
          moduleId: 'm_contacts',
          enabled: true,
          enabledAt: new Date('2026-05-10T00:00:00Z'),
          enabledBy: ctx.userId,
          configJson: { theme: 'dark' },
        },
      ]);
      const rows = await svc.listForActiveOrg(ctx);
      const contacts = rows.find((r) => r.slug === 'contacts');
      expect(contacts?.enabled).toBe(true);
      expect(contacts?.enabledBy).toBe(ctx.userId);
      expect(contacts?.config).toEqual({ theme: 'dark' });
    });
  });
});
