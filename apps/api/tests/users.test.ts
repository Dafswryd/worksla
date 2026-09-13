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

describe('GET /staff', () => {
  it('admin melihat seluruh pegawai dengan angka 30 hari', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.get('/staff')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('completed30')
    expect(res.body[0]).toHaveProperty('avgDays')
  })

  it('monitor hanya melihat pengaju clusternya, plus meja lintas cluster', async () => {
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.get('/staff')
    const submitters = res.body.filter((s: { type: string }) => s.type === 'submitter')
    for (const s of submitters) expect(s.scope).toBe('HCRC')
  })

  it('peran operasional ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    expect((await sari.get('/staff')).status).toBe(403)
  })
})

describe('POST /users', () => {
  it('admin bisa membuat akun dan akun itu bisa login', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.post('/users').send({
      email: 'baru@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Pegawai Baru',
      type: 'submitter',
      position: 'Pengaju · Cluster MedTech',
      initials: 'PB',
      cluster: 'MedTech',
    })
    expect(res.status).toBe(201)
    expect(res.body.passwordHash).toBeUndefined()
    await expect(loginAs(app, 'baru@ui.ac.id', 'sandi-kuat-123')).resolves.toBeTruthy()
  })

  it('menolak email ganda', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const body = {
      email: 'sari.d@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Kembar',
      type: 'secretary',
      position: 'Sekret',
      initials: 'KK',
      category: 'finance',
    }
    expect((await admin.post('/users').send(body)).status).toBe(400)
  })

  it('menolak sekret tanpa kategori', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.post('/users').send({
      email: 'tanpa@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Tanpa Kategori',
      type: 'secretary',
      position: 'Sekret',
      initials: 'TK',
    })
    expect(res.status).toBe(400)
  })

  it('non-admin ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    expect((await sari.post('/users').send({})).status).toBe(403)
  })
})

describe('PATCH /users/:id', () => {
  it('menonaktifkan akun akan mencabut sesinya', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: 'tuti.m@ui.ac.id' } })
    const tuti = await loginAs(app, 'tuti.m@ui.ac.id', PW)
    expect((await tuti.get('/auth/me')).status).toBe(200)

    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    await admin.patch(`/users/${target.id}`).send({ active: false })

    expect((await tuti.get('/auth/me')).status).toBe(401)
  })
})
