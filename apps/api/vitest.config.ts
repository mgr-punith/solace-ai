import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Each integration file migrates the same disposable database; avoid concurrent DDL.
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
