import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
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

type Agent = Awaited<ReturnType<typeof loginAs>>

/** Upload a real object to MinIO and return the document id the server issued. */
async function uploadedDocument(agent: Agent, kind: 'primary' | 'supporting'): Promise<string> {
  const res = await agent
    .post('/documents/upload-url')
    .send({ filename: `${kind}.pdf`, contentType: 'application/pdf', sizeBytes: 12, kind })
  await fetch(res.body.uploadUrl, {
    method: 'PUT',
    body: Buffer.from('%PDF-1.4 hi'),
    headers: { 'Content-Type': 'application/pdf' },
  })
  return res.body.documentId as string
}

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

describe('GET /documents/:id/download-url', () => {
  /**
   * This endpoint is what actually hands out the file bytes, so its scope check
   * is the one boundary that matters most. `isVisible` on the owning submission
   * is the whole gate: a document is reachable exactly when the submission it
   * belongs to is.
   */
  async function financeSubmissionWithDocument(): Promise<{ code: string; documentId: string }> {
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(rina, 'primary')
    const created = await rina.post('/submissions').send({
      title: 'Berkas dengan lampiran nyata',
      category: 'finance',
      primaryDocumentId: primary,
      supportingDocumentIds: [],
    })
    expect(created.status).toBe(201)
    return { code: created.body.code as string, documentId: primary }
  }

  it('pemilik berkas dalam lingkup menerima URL unduhan', async () => {
    const { documentId } = await financeSubmissionWithDocument()
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    const res = await rina.get(`/documents/${documentId}/download-url`)
    expect(res.status).toBe(200)
    expect(res.body.url).toContain('http')

    // The signed URL must actually resolve to the object, not merely look like a URL.
    const fetched = await fetch(res.body.url)
    expect(fetched.status).toBe(200)
  })

  it('sekret yang ditugaskan juga menerima URL unduhan', async () => {
    const { documentId } = await financeSubmissionWithDocument()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.get(`/documents/${documentId}/download-url`)
    expect(res.status).toBe(200)
    expect(res.body.url).toContain('http')
  })

  it('di luar lingkup menjawab 404, bukan URL maupun 403', async () => {
    const { documentId } = await financeSubmissionWithDocument()

    // Andi is a submitter on someone else's document; Budi handles personnel,
    // not this submission; Ferry watches MedTech, not HCRC. None of the three
    // may learn even that the id exists.
    for (const email of ['andi.p@ui.ac.id', 'budi.s@ui.ac.id', 'ferry.g@ui.ac.id']) {
      const agent = await loginAs(app, email, PW)
      const res = await agent.get(`/documents/${documentId}/download-url`)
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('not_found')
    }
  })

  it('dokumen yang belum terpasang di pengajuan mana pun menjawab 404', async () => {
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const loose = await uploadedDocument(rina, 'supporting')
    const res = await rina.get(`/documents/${loose}/download-url`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    const doc = await prisma.document.findFirst({ where: { status: 'ready' } })
    const res = await request(app).get(`/documents/${doc?.id ?? 'x'}/download-url`)
    expect(res.status).toBe(401)
  })
})
