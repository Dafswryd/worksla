import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db/client'

// Regression guard: db/client.ts must not depend on env.ts having run first
// to populate process.env.DATABASE_URL. This file imports db/client as its
// very first import (before anything that could load .env as a side effect)
// so that, under the old `new PrismaClient()` implementation which reads
// process.env directly, this test fails with
// "PrismaClientInitializationError: Environment variable not found:
// DATABASE_URL" whenever it happens to run before any file that imports
// env.ts. The fixed client passes the URL from the validated env object
// explicitly, so this always passes regardless of import order.
describe('db/client env independence', () => {
  it('menjalankan kueri sederhana tanpa bergantung pada urutan impor env', async () => {
    const rows = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`
    expect(rows[0]?.result).toBe(1)
  })
})
