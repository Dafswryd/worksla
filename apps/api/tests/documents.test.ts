import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

describe('POST /documents/upload-url', () => {
  it('menerbitkan URL dan membuat baris pending', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'nota.pdf', contentType: 'application/pdf', sizeBytes: 1024, kind: 'primary' })
    expect(res.status).toBe(200)
    expect(res.body.uploadUrl).toContain('http')
    expect(res.body.documentId).toBeTruthy()
  })

  it('menolak tipe berkas di luar daftar izin', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'jahat.exe', contentType: 'application/x-msdownload', sizeBytes: 10, kind: 'supporting' })
    expect(res.body.error.code).toBe('unsupported_file_type')
  })

  it('menolak ukuran melebihi batas', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'besar.pdf', contentType: 'application/pdf', sizeBytes: 999_999_999, kind: 'primary' })
    expect(res.body.error.code).toBe('file_too_large')
  })

  it('menolak nama berkas dengan karakter kendali (CR/LF)', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent.post('/documents/upload-url').send({
      filename: 'nota\r\nX-Injected: 1.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      kind: 'primary',
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('bad_request')
  })

  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).post('/documents/upload-url').send({})
    expect(res.status).toBe(401)
  })
})
