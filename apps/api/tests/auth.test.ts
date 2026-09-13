import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { hashPassword } from '../src/modules/auth/service'
import { disconnectDb, resetDb } from './helpers/db'

const app = createApp()

beforeEach(async () => {
  await resetDb()
  await prisma.user.create({
    data: {
      email: 'sari.d@ui.ac.id',
      passwordHash: await hashPassword('rahasia123'),
      name: 'Sari Dewi',
      type: 'secretary',
      position: 'Sekret Keuangan',
      initials: 'SD',
      category: 'finance',
    },
  })
})

afterAll(disconnectDb)

describe('POST /auth/login', () => {
  it('menerima kredensial yang benar dan memasang cookie', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Sari Dewi')
    expect(res.body.category).toBe('finance')
    expect(res.body.passwordHash).toBeUndefined()
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly')
  })

  it('menolak password salah tanpa membocorkan apa yang salah', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'salah' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('invalid_credentials')
  })

  it('memberi kode yang sama untuk email tak dikenal', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hantu@ui.ac.id', password: 'apa pun' })
    expect(res.body.error.code).toBe('invalid_credentials')
  })

  it('menolak akun nonaktif', async () => {
    await prisma.user.update({ where: { email: 'sari.d@ui.ac.id' }, data: { active: false } })
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    expect(res.body.error.code).toBe('invalid_credentials')
  })
})

describe('GET /auth/me', () => {
  it('menolak tanpa sesi', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthenticated')
  })

  it('mengembalikan peran setelah login', async () => {
    const agent = request.agent(app)
    await agent.post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    const res = await agent.get('/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.id).toBeTruthy()
    expect(res.body.name).toBe('Sari Dewi')
  })
})

describe('POST /auth/logout', () => {
  it('mencabut sesi sehingga request berikutnya ditolak', async () => {
    const agent = request.agent(app)
    await agent.post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    await agent.post('/auth/logout')
    const res = await agent.get('/auth/me')
    expect(res.status).toBe(401)
    expect(await prisma.session.count()).toBe(0)
  })
})
