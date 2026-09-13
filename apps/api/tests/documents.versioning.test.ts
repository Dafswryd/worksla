import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

async function uploaded(agent: Awaited<ReturnType<typeof loginAs>>, kind: 'primary' | 'supporting') {
  const res = await agent
    .post('/documents/upload-url')
    .send({ filename: `${kind}-baru.pdf`, contentType: 'application/pdf', sizeBytes: 12, kind })
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

describe('POST /submissions/:code/documents', () => {
  it('pengaju bisa mengunggah versi baru dokumen utama saat berkas dikembalikan', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const id = await uploaded(rina, 'primary')

    const res = await rina
      .post(`/submissions/${row.code}/documents`)
      .send({ documentId: id, kind: 'primary', note: 'Perbaikan sesuai poin 1' })

    expect(res.status).toBe(200)
    const last = res.body.history[res.body.history.length - 1]
    expect(last.action).toContain('dokumen pengajuan')
  })

  it('dokumen utama beku setelah lewat meja pengaju', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running' },
    })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const id = await uploaded(rina, 'primary')

    const res = await rina.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'primary' })
    expect([403, 404]).toContain(res.status)
    if (res.status === 403) expect(res.body.error.code).toBe('primary_document_frozen')
  })

  it('pemegang berkas boleh menambah dokumen pendamping', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running' },
    })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const id = await uploaded(sari, 'supporting')

    const res = await sari.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(res.status).toBe(200)
  })

  it('versi lama tetap tersimpan dan tidak lagi current', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    const v1 = await uploaded(rina, 'primary')
    await rina.post(`/submissions/${row.code}/documents`).send({ documentId: v1, kind: 'primary' })
    const v2 = await uploaded(rina, 'primary')
    await rina.post(`/submissions/${row.code}/documents`).send({ documentId: v2, kind: 'primary' })

    const docs = await prisma.document.findMany({ where: { submissionId: row.id, kind: 'primary' } })
    expect(docs).toHaveLength(2)
    expect(docs.filter((d) => d.isCurrent)).toHaveLength(1)
    expect(docs.find((d) => d.isCurrent)?.version).toBe(2)
    expect(docs.every((d) => d.lineageId === docs[0]!.lineageId)).toBe(true)
  })
})
