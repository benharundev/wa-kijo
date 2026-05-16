import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, type TestDb } from '../setup/testcontainers';
import { createTestOrg } from '../setup/test-factories';

/**
 * Integration test — Module Registry (ADR-0008).
 *
 * Asserts the **DB-level guarantees** the registry depends on:
 *  - `Module.slug` is globally unique.
 *  - `TenantModule` is keyed on `(organizationId, moduleId)` — at most
 *    one row per (org, module) pair.
 *  - Enabling a module for tenant A does NOT make it enabled for
 *    tenant B (the prime tenant-isolation guarantee).
 *  - `Module.status = 'retired'` is a soft-retirement (rows persist;
 *    historical TenantModule references keep resolving).
 *
 * The `ModuleRegistryService` and `RequireModuleGuard` themselves are
 * tested with mocks in their `*.spec.ts` siblings. This file is
 * specifically about the SQL contract.
 */
describe('Module Registry — cross-tenant isolation (DB layer)', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await setupTestDb();
  }, 60_000);

  afterAll(async () => {
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    // Reset between tests — table-scoped delete is fine since we
    // own the container.
    await db.prisma.tenantModule.deleteMany();
    await db.prisma.module.deleteMany();
  });

  it('Module.slug is globally unique', async () => {
    await db.prisma.module.create({
      data: {
        slug: 'workshop',
        name: 'Workshop',
        version: '0.1.0',
        manifestJson: { slug: 'workshop' },
      },
    });

    await expect(
      db.prisma.module.create({
        data: {
          slug: 'workshop',
          name: 'Workshop dup',
          version: '0.2.0',
          manifestJson: { slug: 'workshop' },
        },
      }),
    ).rejects.toThrow();
  });

  it('TenantModule has a composite PK on (organizationId, moduleId)', async () => {
    const org = await createTestOrg(db.prisma);
    const m = await db.prisma.module.create({
      data: {
        slug: 'workshop',
        name: 'Workshop',
        version: '0.1.0',
        manifestJson: {},
      },
    });

    await db.prisma.tenantModule.create({
      data: { organizationId: org.id, moduleId: m.id, enabled: true },
    });

    await expect(
      db.prisma.tenantModule.create({
        data: { organizationId: org.id, moduleId: m.id, enabled: false },
      }),
    ).rejects.toThrow();
  });

  it('enabling a module for tenant A does NOT enable it for tenant B', async () => {
    const orgA = await createTestOrg(db.prisma, { slug: 'tenant-a' });
    const orgB = await createTestOrg(db.prisma, { slug: 'tenant-b' });
    const m = await db.prisma.module.create({
      data: {
        slug: 'workshop',
        name: 'Workshop',
        version: '0.1.0',
        manifestJson: {},
      },
    });

    await db.prisma.tenantModule.create({
      data: {
        organizationId: orgA.id,
        moduleId: m.id,
        enabled: true,
        enabledAt: new Date(),
      },
    });

    const aRow = await db.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: orgA.id, moduleId: m.id } },
    });
    const bRow = await db.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: orgB.id, moduleId: m.id } },
    });

    expect(aRow?.enabled).toBe(true);
    expect(bRow).toBeNull();        // tenant B has no row at all
  });

  it('disabling for tenant A does NOT change tenant B', async () => {
    const orgA = await createTestOrg(db.prisma, { slug: 'tenant-a' });
    const orgB = await createTestOrg(db.prisma, { slug: 'tenant-b' });
    const m = await db.prisma.module.create({
      data: {
        slug: 'workshop',
        name: 'Workshop',
        version: '0.1.0',
        manifestJson: {},
      },
    });

    await db.prisma.tenantModule.createMany({
      data: [
        { organizationId: orgA.id, moduleId: m.id, enabled: true, enabledAt: new Date() },
        { organizationId: orgB.id, moduleId: m.id, enabled: true, enabledAt: new Date() },
      ],
    });

    await db.prisma.tenantModule.update({
      where: { organizationId_moduleId: { organizationId: orgA.id, moduleId: m.id } },
      data: { enabled: false },
    });

    const aRow = await db.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: orgA.id, moduleId: m.id } },
    });
    const bRow = await db.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: orgB.id, moduleId: m.id } },
    });

    expect(aRow?.enabled).toBe(false);
    expect(bRow?.enabled).toBe(true); // tenant B unaffected
  });

  it('retired modules preserve their TenantModule rows (history-safe)', async () => {
    const org = await createTestOrg(db.prisma);
    const m = await db.prisma.module.create({
      data: {
        slug: 'legacy',
        name: 'Legacy',
        version: '0.0.9',
        manifestJson: {},
      },
    });
    await db.prisma.tenantModule.create({
      data: { organizationId: org.id, moduleId: m.id, enabled: true },
    });

    // Retire the module — DO NOT delete it.
    await db.prisma.module.update({
      where: { id: m.id },
      data: { status: 'retired' },
    });

    const stillThere = await db.prisma.tenantModule.findUnique({
      where: { organizationId_moduleId: { organizationId: org.id, moduleId: m.id } },
    });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.enabled).toBe(true);

    // The module row is still queryable by slug for audit purposes.
    const moduleRow = await db.prisma.module.findUnique({ where: { slug: 'legacy' } });
    expect(moduleRow?.status).toBe('retired');
  });

  it('cascading: deleting an org removes its TenantModule rows but not the Module', async () => {
    const org = await createTestOrg(db.prisma);
    const m = await db.prisma.module.create({
      data: {
        slug: 'workshop',
        name: 'Workshop',
        version: '0.1.0',
        manifestJson: {},
      },
    });
    await db.prisma.tenantModule.create({
      data: { organizationId: org.id, moduleId: m.id, enabled: true },
    });

    await db.prisma.organization.delete({ where: { id: org.id } });

    const tmCount = await db.prisma.tenantModule.count();
    const moduleStillExists = await db.prisma.module.findUnique({ where: { id: m.id } });

    expect(tmCount).toBe(0);
    expect(moduleStillExists).not.toBeNull();
  });
});
