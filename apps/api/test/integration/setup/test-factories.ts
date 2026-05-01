import type { PrismaClient } from '@wa-kijo/db';
import type { Role } from '@wa-kijo/shared';

/**
 * Test factory helpers.
 *
 * These bypass Better Auth (which needs HTTP) and write directly to Prisma.
 * They are integration-test-only — never use in production code.
 */

let _idCounter = 0;
const nextId = () => `test_${String(++_idCounter).padStart(6, '0')}`;

export async function createTestOrg(
  prisma: PrismaClient,
  overrides: {
    name?: string;
    slug?: string;
    orgType?: string;
    parentOrgId?: string;
  } = {},
) {
  const slug = overrides.slug ?? `org-${nextId()}`;
  return prisma.organization.create({
    data: {
      name: overrides.name ?? slug,
      slug,
      orgType: overrides.orgType ?? 'WORKSPACE',
      parentOrgId: overrides.parentOrgId ?? null,
    },
  });
}

export async function createTestUser(
  prisma: PrismaClient,
  overrides: { email?: string; name?: string } = {},
) {
  const id = nextId();
  return prisma.user.create({
    data: {
      id,
      name: overrides.name ?? `Test User ${id}`,
      email: overrides.email ?? `user-${id}@test.invalid`,
      emailVerified: true,
    },
  });
}

export async function createTestMember(
  prisma: PrismaClient,
  userId: string,
  organizationId: string,
  role: Role = 'member',
) {
  return prisma.member.create({
    data: { userId, organizationId, role },
  });
}

/**
 * Creates a complete test tenant: org + user + member record.
 * Returns enough data to build a mock RequestContext.
 */
export async function createTestTenant(
  prisma: PrismaClient,
  opts: { role?: Role; orgType?: string; parentOrgId?: string } = {},
) {
  const org = await createTestOrg(prisma, {
    orgType: opts.orgType,
    parentOrgId: opts.parentOrgId,
  });
  const user = await createTestUser(prisma);
  const member = await createTestMember(prisma, user.id, org.id, opts.role ?? 'member');
  return { org, user, member };
}
