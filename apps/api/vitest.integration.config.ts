import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    // Integration tests spin up real Postgres containers — allow enough time.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Run integration suites serially — each suite manages its own container.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true },
      },
    }),
  ],
});
