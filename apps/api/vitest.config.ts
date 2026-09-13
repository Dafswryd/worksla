import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30_000,
    // The default 5s testTimeout is tight for the first test in a cold run:
    // Prisma's query engine spawns its binary lazily on the first real query,
    // and the first request against MinIO pays for its own connection setup.
    // Both are one-time costs, not per-test slowness, so a single generous
    // timeout (rather than per-test overrides) absorbs them everywhere.
    testTimeout: 15_000,
  },
})
