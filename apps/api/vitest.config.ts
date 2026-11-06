import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Each integration file migrates the same isolated branch; avoid concurrent DDL.
  test: {
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
