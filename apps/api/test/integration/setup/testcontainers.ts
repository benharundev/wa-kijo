import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as path from 'path';
import { PrismaClient } from '@wa-kijo/db';

export interface TestDb {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
  databaseUrl: string;
}

// Resolve paths relative to the monorepo root
// __dirname: <root>/apps/api/test/integration/setup
// 5 levels up → <root>
const MONOREPO_ROOT = path.resolve(__dirname, '../../../../../');
const SCHEMA_PATH = path.join(MONOREPO_ROOT, 'packages/db/prisma/schema.prisma');
// Use the pnpm-managed prisma binary (not a global install)
const PRISMA_BIN = path.join(MONOREPO_ROOT, 'node_modules/.pnpm/node_modules/.bin/prisma');

/**
 * Starts a real Postgres 16 container, runs all Prisma migrations,
 * and returns a connected PrismaClient.
 *
 * Call teardownTestDb() in afterAll() to stop the container.
 */
export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('wakijo_test')
    .withUsername('wakijo_test')
    .withPassword('wakijo_test')
    .start();

  const databaseUrl = container.getConnectionUri();

  // Run all migrations against the fresh container
  execSync(`"${PRISMA_BIN}" migrate deploy --schema="${SCHEMA_PATH}"`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();

  return { prisma, container, databaseUrl };
}

export async function teardownTestDb(db: TestDb): Promise<void> {
  await db.prisma.$disconnect();
  await db.container.stop();
}
