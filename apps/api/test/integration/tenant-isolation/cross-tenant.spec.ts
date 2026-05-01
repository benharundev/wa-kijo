/**
 * Cross-tenant isolation tests — the most important tests in this codebase.
 *
 * These tests verify that BaseRepository.tenantWhere() correctly prevents
 * a user from one org from reading or mutating data belonging to another org.
 *
 * Rationale (from security.md): Tenant leaks are the most likely catastrophic
 * bug class in this product line. Every new repository must have a sibling test
 * in this suite asserting cross-org access returns null / empty list.
 *
 * Tests run against a real Postgres container via Testcontainers.
 * No mocks — any mock/prod divergence is a hidden vulnerability.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb, type TestDb } from '../setup/testcontainers';
import { createTestTenant, createTestOrg, createTestUser, createTestMember } from '../setup/test-factories';
import type { RequestContext } from '../../../src/common/context/request-context';

// ---------------------------------------------------------------------------
// Minimal concrete repository for testing — mirrors real repo pattern
// ---------------------------------------------------------------------------
import { BaseRepository } from '../../../src/base/base.repository';
import type { PrismaClient } from '@wa-kijo/db';
// Use the Member model as the test subject (a real model with orgId scoping)
type MemberRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
};

class MemberRepository extends BaseRepository<
  MemberRecord,
  { organizationId: string; userId: string; role: string },
  { role: string },
  { id: string },
  PrismaClient['member']
> {
  constructor(prisma: PrismaClient) {
    // PrismaService isn't used in tests — we pass raw PrismaClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(prisma as any, prisma.member, 'MemberRepository');
  }

  protected tenantWhere(ctx: RequestContext): Record<string, unknown> {
    return { organizationId: ctx.orgId };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(userId: string, orgId: string): RequestContext {
  return {
    userId,
    orgId,
    orgType: 'WORKSPACE',
    userRole: 'admin',
    globalRole: 'user',
    requestId: 'test-request',
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

let db: TestDb;
let repo: MemberRepository;

beforeAll(async () => {
  db = await setupTestDb();
  repo = new MemberRepository(db.prisma);
});

afterAll(async () => {
  await teardownTestDb(db);
});

describe('Cross-tenant isolation — MemberRepository', () => {
  it('findAll: user in org A cannot see records from org B', async () => {
    const tenantA = await createTestTenant(db.prisma, { role: 'admin' });
    const tenantB = await createTestTenant(db.prisma, { role: 'member' });

    // Org A has 1 member; org B has 1 member.
    // User A queries with org A context — must only see org A's member.
    const ctxA = makeCtx(tenantA.user.id, tenantA.org.id);
    const resultA = await repo.findAll(ctxA);
    const orgAIds = resultA.data.map((m) => m.organizationId);

    expect(orgAIds).not.toContain(tenantB.org.id);
    expect(orgAIds.every((id) => id === tenantA.org.id)).toBe(true);

    // User B queries with org B context — must only see org B's member.
    const ctxB = makeCtx(tenantB.user.id, tenantB.org.id);
    const resultB = await repo.findAll(ctxB);
    const orgBIds = resultB.data.map((m) => m.organizationId);

    expect(orgBIds).not.toContain(tenantA.org.id);
    expect(orgBIds.every((id) => id === tenantB.org.id)).toBe(true);
  });

  it('findById: user in org A cannot retrieve a record that belongs to org B', async () => {
    const tenantA = await createTestTenant(db.prisma, { role: 'owner' });
    const tenantB = await createTestTenant(db.prisma, { role: 'member' });

    // Attempt to read org B's member record using org A's context
    const ctxA = makeCtx(tenantA.user.id, tenantA.org.id);
    const result = await repo.findById(ctxA, tenantB.member.id);

    // Must return null — not the record, not a 403, not an error.
    expect(result).toBeNull();
  });

  it('count: only counts records within the active org', async () => {
    const tenantA = await createTestTenant(db.prisma, { role: 'admin' });
    const tenantB = await createTestTenant(db.prisma, { role: 'admin' });

    // Add a second member to org A
    const extraUser = await createTestUser(db.prisma);
    await createTestMember(db.prisma, extraUser.id, tenantA.org.id);

    const ctxA = makeCtx(tenantA.user.id, tenantA.org.id);
    const ctxB = makeCtx(tenantB.user.id, tenantB.org.id);

    const countA = await repo.count(ctxA);
    const countB = await repo.count(ctxB);

    // Org A has 2 members, org B has 1 — neither count must bleed across.
    expect(countA).toBe(2);
    expect(countB).toBe(1);
  });

  it('parent-child hierarchy: member of child org cannot see parent-org-only records', async () => {
    // AGENCY (parent) → WORKSPACE (child)
    const agencyTenant = await createTestTenant(db.prisma, {
      role: 'owner',
      orgType: 'AGENCY',
    });
    const workspaceTenant = await createTestTenant(db.prisma, {
      role: 'member',
      orgType: 'WORKSPACE',
      parentOrgId: agencyTenant.org.id,
    });

    // Add a member to the agency that is NOT in the workspace
    const agencyOnlyUser = await createTestUser(db.prisma);
    await createTestMember(db.prisma, agencyOnlyUser.id, agencyTenant.org.id);

    // Workspace user queries — must only see workspace members
    const ctxWorkspace = makeCtx(workspaceTenant.user.id, workspaceTenant.org.id);
    const result = await repo.findAll(ctxWorkspace);

    expect(result.data.every((m) => m.organizationId === workspaceTenant.org.id)).toBe(true);
    expect(result.data.some((m) => m.organizationId === agencyTenant.org.id)).toBe(false);
  });

  it('property: random cross-org findById always returns null', async () => {
    // Create 5 orgs, each with 1 member. Assert each org can only see its own.
    const tenants = await Promise.all(
      Array.from({ length: 5 }, () => createTestTenant(db.prisma)),
    );

    for (const tenantA of tenants) {
      for (const tenantB of tenants) {
        if (tenantA.org.id === tenantB.org.id) continue;

        const ctx = makeCtx(tenantA.user.id, tenantA.org.id);
        const result = await repo.findById(ctx, tenantB.member.id);
        expect(result).toBeNull();
      }
    }
  });
});
