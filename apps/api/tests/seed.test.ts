import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'

beforeEach(resetDb)
afterAll(disconnectDb)

describe('seed', () => {
  it('mengisi dua belas akun, aturan tahap, dan rute kategori', async () => {
    await seed()
    // 12, not the prototype's 9 login roles: three submissions requesters
    // (Andi, Lestari, Dimas) appear in apps/web/src/constants/submissions.ts
    // but were never part of the frontend's login-capable ROLES map.
    // Submission.requesterId is a required foreign key to User, so seeding
    // their submissions under their real names — as the brief requires —
    // needs a real row for each of them too. See prisma/seed.ts for the
    // full reasoning.
    expect(await prisma.user.count()).toBe(12)
    expect(await prisma.stageRule.count()).toBe(6)
    expect(await prisma.categoryRoute.count()).toBe(3)
  })

  it('tiap pengajuan punya sekret yang terkunci dan riwayat', async () => {
    await seed()
    const submissions = await prisma.submission.findMany({ include: { history: true } })
    expect(submissions.length).toBeGreaterThan(0)
    for (const s of submissions) {
      expect(s.assignedSecretaryId).toBeTruthy()
      expect(s.history.length).toBeGreaterThan(0)
    }
  })

  it('berkas yang dikembalikan punya checklist yang menggantung pada entri pengembalian', async () => {
    await seed()
    const returned = await prisma.submission.findFirst({
      where: { status: 'returned' },
      include: { checklist: true },
    })
    expect(returned).toBeTruthy()
    expect(returned!.checklist.length).toBeGreaterThan(0)
    for (const item of returned!.checklist) {
      expect(item.historyEntryId).toBeTruthy()
    }
  })

  it('bisa dijalankan dua kali tanpa menggandakan data', async () => {
    await seed()
    await seed()
    expect(await prisma.user.count()).toBe(12)
    expect(await prisma.submission.count()).toBe(20)
  })

  it('menolak jalan di production', async () => {
    const before = process.env['NODE_ENV']
    process.env['NODE_ENV'] = 'production'
    await expect(seed()).rejects.toThrow(/production/i)
    process.env['NODE_ENV'] = before
  })
})
