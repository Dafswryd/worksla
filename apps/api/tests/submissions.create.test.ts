import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

async function uploadedDocument(agent: Awaited<ReturnType<typeof loginAs>>, kind: 'primary' | 'supporting') {
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

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /submissions', () => {
  it('pengaju bisa membuat, dan berkas mendarat di meja sekret', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(agent, 'primary')

    const res = await agent.post('/submissions').send({
      title: 'Pengadaan rak arsip',
      category: 'finance',
      summary: 'Rak arsip penuh.',
      primaryDocumentId: primary,
      supportingDocumentIds: [],
    })

    expect(res.status).toBe(201)
    expect(res.body.stageKey).toBe('secretary')
    expect(res.body.status).toBe('running')
    expect(res.body.code).toMatch(/^PJK-\d{4}-\d{3}$/)
    expect(res.body.history).toHaveLength(1)
    expect(res.body.history[0].kind).toBe('submit')
  })

  it('mengunci sekret sesuai rute saat dibuat', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(agent, 'primary')
    const res = await agent
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: primary, supportingDocumentIds: [] })

    const row = await prisma.submission.findUnique({
      where: { code: res.body.code },
      include: { assignedSecretary: true },
    })
    expect(row?.assignedSecretary.name).toBe('Sari Dewi')
  })

  it('berkas yang sudah berjalan tidak ikut pindah saat rute diubah', async () => {
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(rina, 'primary')
    const created = await rina
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: primary, supportingDocumentIds: [] })

    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi.s@ui.ac.id' } })
    await prisma.categoryRoute.update({ where: { category: 'finance' }, data: { secretaryId: budi.id } })

    const row = await prisma.submission.findUnique({
      where: { code: created.body.code },
      include: { assignedSecretary: true },
    })
    expect(row?.assignedSecretary.name).toBe('Sari Dewi')
  })

  it('menolak peran selain pengaju', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: 'x', supportingDocumentIds: [] })
    expect(res.status).toBe(403)
  })

  it('menolak kalau dokumen utama belum benar-benar terunggah', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res0 = await agent
      .post('/documents/upload-url')
      .send({ filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    const res = await agent.post('/submissions').send({
      title: 'X',
      category: 'finance',
      primaryDocumentId: res0.body.documentId,
      supportingDocumentIds: [],
    })
    expect(res.body.error.code).toBe('document_not_uploaded')
  })

  it('nomor urut tidak pernah tabrakan walau dibuat bersamaan', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const docs = await Promise.all([1, 2, 3, 4, 5].map(() => uploadedDocument(agent, 'primary')))

    const results = await Promise.all(
      docs.map((id) =>
        agent
          .post('/submissions')
          .send({ title: 'Serentak', category: 'finance', primaryDocumentId: id, supportingDocumentIds: [] }),
      ),
    )

    const codes = results.map((r) => r.body.code)
    expect(new Set(codes).size).toBe(5)
  })
})
