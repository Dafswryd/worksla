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
    // 4 submitters + 3 secretaries + 1 deputy + 1 director; admins and monitors excluded.
    expect(res.body.length).toBe(9)
    expect(res.body[0]).toHaveProperty('completed30')
    expect(res.body[0]).toHaveProperty('avgDays')
  })

  it('monitor hanya melihat pengaju clusternya, plus meja lintas cluster', async () => {
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.get('/staff')
    // Rina (HCRC submitter) + 3 secretaries + 1 deputy + 1 director; the other
    // three clusters' submitters are filtered out — this is a privacy boundary,
    // not just a display preference, so the count must be exact.
    expect(res.body.length).toBe(6)
    const submitters = res.body.filter((s: { type: string }) => s.type === 'submitter')
    expect(submitters.length).toBeGreaterThan(0)
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
    // The 401 above would also happen if `active` were merely flipped, since
    // roleForToken already rejects an inactive user's session regardless of
    // whether the row still exists. What actually distinguishes "revoked" from
    // "suspended" is that the row itself is gone — assert that directly.
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0)
  })

  it('mengaktifkan kembali tidak memulihkan sesi lama — kuki lama tetap mati', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: 'tuti.m@ui.ac.id' } })
    const tuti = await loginAs(app, 'tuti.m@ui.ac.id', PW)
    expect((await tuti.get('/auth/me')).status).toBe(200)

    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    await admin.patch(`/users/${target.id}`).send({ active: false })
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0)

    // Reactivate the account, but the ORIGINAL agent's cookie must not regain
    // access — its session row was deleted, not merely suspended, so
    // reactivating the account cannot bring it back. A flag-flip-only
    // implementation would let this old cookie work again once `active` is
    // true; that is exactly the behaviour this test is here to catch.
    await admin.patch(`/users/${target.id}`).send({ active: true })

    expect((await tuti.get('/auth/me')).status).toBe(401)
  })
})
