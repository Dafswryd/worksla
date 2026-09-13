import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('GET /flow-rules', () => {
  it('terbuka untuk semua peran yang login, bukan admin saja', async () => {
    for (const email of ['rina.k@ui.ac.id', 'sari.d@ui.ac.id', 'nadia.r@ui.ac.id', 'yoga.p@ui.ac.id']) {
      const agent = await loginAs(app, email, PW)
      const res = await agent.get('/flow-rules')
      expect(res.status).toBe(200)
      expect(res.body.stages).toHaveLength(6)
    }
  })

  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    expect((await request(app).get('/flow-rules')).status).toBe(401)
  })

  it('mengembalikan SLA dan rute', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/flow-rules')
    expect(res.body.stages.find((s: { key: string }) => s.key === 'secretary').sla).toBe(1)
    expect(res.body.stages.find((s: { key: string }) => s.key === 'submitter').sla).toBeNull()
    expect(res.body.route.finance).toBeTruthy()
  })
})

describe('PUT /flow-rules/stages/:key', () => {
  it('admin bisa mengubah batas, dan berlaku langsung', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.put('/flow-rules/stages/secretary').send({ slaDays: 3 })
    expect(res.status).toBe(200)

    const after = await admin.get('/flow-rules')
    expect(after.body.stages.find((s: { key: string }) => s.key === 'secretary').sla).toBe(3)
  })

  it('menjepit ke rentang 1..14', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    expect((await admin.put('/flow-rules/stages/deputy').send({ slaDays: 0 })).status).toBe(400)
    expect((await admin.put('/flow-rules/stages/deputy').send({ slaDays: 99 })).status).toBe(400)
  })

  it('non-admin ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.put('/flow-rules/stages/secretary').send({ slaDays: 5 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('admin_only')
  })
})

describe('PUT /flow-rules/routes/:category', () => {
  it('admin bisa mengarahkan kategori ke sekret lain', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi.s@ui.ac.id' } })
    const res = await admin.put('/flow-rules/routes/finance').send({ secretaryId: budi.id })
    expect(res.status).toBe(200)

    const after = await admin.get('/flow-rules')
    expect(after.body.route.finance).toBe(budi.id)
  })

  it('menolak pengguna yang bukan sekret', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const hendra = await prisma.user.findUniqueOrThrow({ where: { email: 'hendra.w@ui.ac.id' } })
    const res = await admin.put('/flow-rules/routes/finance').send({ secretaryId: hendra.id })
    expect(res.status).toBe(400)
  })
})
