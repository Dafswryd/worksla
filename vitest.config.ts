import { defineConfig } from 'vitest/config'

// The root `vitest run` is for workspace packages with no external
// dependencies (currently packages/shared). apps/api has its own
// vitest.config.ts and needs Docker services + apps/api/.env, so it is run
// via `npm test -w @imeri/api`, not swept up here.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/api/**'],
  },
})
