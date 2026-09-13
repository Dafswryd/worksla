import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeAll(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('GET /submissions', () => {
  it('menolak tanpa sesi', async () => {
    const res = await request(app).get('/submissions')
    expect(res.status).toBe(401)
  })

  it('sekret Keuangan hanya menerima berkas kategori finance', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) expect(item.category).toBe('finance')
  })

  it('monitor cluster hanya menerima berkas clusternya', async () => {
    const agent = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) expect(item.cluster).toBe('HCRC')
  })

  it('pengaju hanya menerima berkas miliknya', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) expect(item.requester).toBe('Rina Kartika')
  })

  it('admin menerima semuanya', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const all = await admin.get('/submissions')
    const some = await sari.get('/submissions')
    expect(all.body.length).toBeGreaterThan(some.body.length)
  })

  it('tidak menerima parameter untuk melihat sebagai peran lain', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/submissions?role=admin&category=personnel')
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) expect(item.category).toBe('finance')
  })

  it('menyertakan daysInStage yang dihitung, bukan tersimpan', async () => {
    const agent = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    const running = res.body.find((s: { status: string }) => s.status === 'running')
    expect(running.daysInStage).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /submissions/:code', () => {
  it('mengembalikan berkas dalam lingkup', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const list = await agent.get('/submissions')
    const code = list.body[0].code
    const res = await agent.get(`/submissions/${code}`)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(code)
    expect(Array.isArray(res.body.history)).toBe(true)
  })

  it('menjawab 404 untuk berkas di luar lingkup, bukan 403', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const all = await admin.get('/submissions')
    const foreign = all.body.find((s: { category: string }) => s.category === 'personnel')

    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.get(`/submissions/${foreign.code}`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('menjawab 404 untuk kode yang tidak ada', async () => {
    const agent = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await agent.get('/submissions/TIDAK-ADA-999')
    expect(res.status).toBe(404)
  })
})
