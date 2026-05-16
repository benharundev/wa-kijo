/**
 * Development seed script for wa'kijo Community.
 *
 * Organisation hierarchy seeded (demonstrates the 3-level AGENCY → WORKSPACE
 * model — see ADR-0001 and docs/architecture.md):
 *
 *   wa'kijo HQ  (SYSTEM)          ← The SaaS operator itself
 *   └── Acme Agency  (AGENCY)     ← Agency customer managing multiple clients
 *       └── Acme Workspace  (WORKSPACE)  ← End-client workspace under Acme
 *
 * Users seeded:
 *
 *   admin@example.com    password123   wa'kijo HQ owner  (platform admin)
 *   agency@example.com   password123   Acme Agency owner
 *   member@example.com   password123   Acme Workspace member
 *
 * Run:    pnpm db:seed
 * Re-run: safe — all operations are upserts.
 */

// @ts-ignore — ESM-only package resolved by tsx at runtime
import { hashPassword } from '@better-auth/utils/password';
import { PrismaClient } from '@prisma/client';

// ── Subscription plans ───────────────────────────────────────────────────────

// These are generic example plans for the wa'kijo Community boilerplate.
// Replace them with the plans that fit the product you're building.
// To enable real Stripe checkout, set stripePriceMonthlyId / stripePriceYearlyId
// on each Plan row after creating the matching products in your Stripe dashboard.
const PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'For small teams getting started.',
    priceMonthly: 4900, // MYR 49.00 — replace with your currency/amount
    priceYearly: 47040, // MYR 470.40 (~2 months free)
    currency: 'MYR',
    features: JSON.stringify([
      'Up to 1,000 contacts',
      '2 team members',
      'Email support',
      'Standard analytics',
    ]),
    limits: JSON.stringify({ contacts: 1000, members: 2 }),
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Growth',
    slug: 'growth',
    description: 'For growing teams that need more scale.',
    priceMonthly: 14900, // MYR 149.00
    priceYearly: 143040, // MYR 1,430.40
    currency: 'MYR',
    features: JSON.stringify([
      'Up to 10,000 contacts',
      '10 team members',
      'Priority email support',
      'Advanced analytics',
      'API access (read-only)',
    ]),
    limits: JSON.stringify({ contacts: 10000, members: 10 }),
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For larger organisations needing unlimited scale.',
    priceMonthly: 49900, // MYR 499.00
    priceYearly: 479040, // MYR 4,790.40
    currency: 'MYR',
    features: JSON.stringify([
      'Unlimited contacts',
      'Unlimited team members',
      'Full API access (read + write)',
      'Custom integrations',
      'Dedicated success manager',
      '99.9% uptime SLA',
    ]),
    limits: JSON.stringify({ contacts: -1, members: -1 }),
    isActive: true,
    sortOrder: 2,
  },
] as const;

const prisma = new PrismaClient();

// ── Seed data ────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'admin@example.com', name: 'Admin', password: 'password123' },
  { email: 'agency@example.com', name: 'Agency Owner', password: 'password123' },
  { email: 'member@example.com', name: 'Workspace User', password: 'password123' },
] as const;

const ORGS = [
  {
    name: "wa'kijo HQ",
    slug: 'wakijo-hq',
    orgType: 'SYSTEM',
    // SaaS platform itself — no parent
  },
  {
    name: 'Acme Agency',
    slug: 'acme-agency',
    orgType: 'AGENCY',
    // Parent set dynamically after wa'kijo HQ is created
  },
  {
    name: 'Acme Workspace',
    slug: 'acme-workspace',
    orgType: 'WORKSPACE',
    // Parent set dynamically after Acme Agency is created
  },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsertUser(data: { email: string; name: string; password: string }) {
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: { emailVerified: true },
    create: { email: data.email, name: data.name, emailVerified: true },
  });

  // Better Auth stores credentials in Account: providerId='credential', accountId=<email>
  const hashed = await hashPassword(data.password);
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'credential', accountId: data.email } },
    update: { password: hashed },
    create: { userId: user.id, providerId: 'credential', accountId: data.email, password: hashed },
  });

  return user;
}

async function upsertOrg(data: {
  name: string;
  slug: string;
  orgType: string;
  parentOrgId?: string;
}) {
  return prisma.organization.upsert({
    where: { slug: data.slug },
    update: {},
    create: {
      name: data.name,
      slug: data.slug,
      orgType: data.orgType,
      parentOrgId: data.parentOrgId ?? null,
    },
  });
}

async function upsertMember(userId: string, orgId: string, role: string) {
  return prisma.member.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    update: { role },
    create: { userId, organizationId: orgId, role },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding dev database...\n');

  // Users
  const [adminUser, agencyUser, memberUser] = (await Promise.all(USERS.map(upsertUser))) as [
    Awaited<ReturnType<typeof upsertUser>>,
    Awaited<ReturnType<typeof upsertUser>>,
    Awaited<ReturnType<typeof upsertUser>>,
  ];
  console.log('  ✓ Users');
  USERS.forEach((u) => console.log(`      ${u.email}  /  ${u.password}`));

  // Organisations (order matters — parent must exist before child)
  console.log('');
  const hqOrg = await upsertOrg(ORGS[0]);
  console.log(`  ✓ Org [SYSTEM]    "${hqOrg.name}"  (id: ${hqOrg.id})`);

  const agencyOrg = await upsertOrg({ ...ORGS[1], parentOrgId: hqOrg.id });
  console.log(
    `  ✓ Org [AGENCY]    "${agencyOrg.name}"  (id: ${agencyOrg.id})  parent → ${hqOrg.name}`,
  );

  const workspaceOrg = await upsertOrg({ ...ORGS[2], parentOrgId: agencyOrg.id });
  console.log(
    `  ✓ Org [WORKSPACE] "${workspaceOrg.name}"  (id: ${workspaceOrg.id})  parent → ${agencyOrg.name}`,
  );

  // Memberships
  console.log('');
  await upsertMember(adminUser.id, hqOrg.id, 'owner');
  await upsertMember(agencyUser.id, agencyOrg.id, 'owner');
  await upsertMember(memberUser.id, workspaceOrg.id, 'member');

  // Platform admin also has owner-level access to the agency (demonstrates hierarchy)
  await upsertMember(adminUser.id, agencyOrg.id, 'owner');

  console.log(`  ✓ ${adminUser.email}   → owner  of "${hqOrg.name}" + "${agencyOrg.name}"`);
  console.log(`  ✓ ${agencyUser.email}  → owner  of "${agencyOrg.name}"`);
  console.log(`  ✓ ${memberUser.email}  → member of "${workspaceOrg.name}"`);

  // Plans (upsert so re-runs are safe)
  console.log('');
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        limits: plan.limits,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
    const monthly = (plan.priceMonthly / 100).toFixed(2);
    const yearly = (plan.priceYearly / 100).toFixed(2);
    console.log(
      `  ✓ Plan [${plan.slug.toUpperCase().padEnd(10)}]  MYR ${monthly}/mo  MYR ${yearly}/yr`,
    );
  }

  console.log('\n✅ Seed complete.\n');
  console.log('  Organisation hierarchy:');
  console.log(`    ${hqOrg.name} [SYSTEM]`);
  console.log(`    └── ${agencyOrg.name} [AGENCY]`);
  console.log(`        └── ${workspaceOrg.name} [WORKSPACE]`);
  console.log('');
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
