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
    // Rina is genuinely the requester (in scope) here — the freeze must
    // reject her specifically, not merely hide the submission from her.
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running', requester: { email: 'rina.k@ui.ac.id' } },
    })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const id = await uploaded(rina, 'primary')

    const res = await rina.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'primary' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('primary_document_frozen')
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

  it('bukan pemegang berkas ditolak 403 saat menambah dokumen pendamping', async () => {
    // Hendra (deputy) can see every submission, but the ball is on the
    // secretary's desk here — he is in scope, just not the current holder.
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running' },
    })
    const hendra = await loginAs(app, 'hendra.w@ui.ac.id', PW)
    const id = await uploaded(hendra, 'supporting')

    const res = await hendra.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('not_your_desk')
  })

  it('aktor di luar cakupan mendapat 404, bukan 403', async () => {
    // Nadia monitors cluster HCRC only; this submission belongs to a
    // different cluster entirely, so it must read as missing, not forbidden.
    const row = await prisma.submission.findFirstOrThrow({
      where: { stageKey: 'secretary', status: 'running', cluster: { not: 'HCRC' } },
    })
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const id = await uploaded(nadia, 'supporting')

    const res = await nadia.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('dokumen yang sudah melekat di pengajuan lain ditolak, dan pengajuan asal tidak berubah', async () => {
    // Both are `general`/`secretary`, both held by Tuti — a realistic
    // scenario for a stale document id being reused by accident, not an
    // attack: document ids are only ever handed to the client that uploaded
    // them.
    const rows = await prisma.submission.findMany({
      where: { category: 'general', stageKey: 'secretary', status: 'running' },
    })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    const [first, second] = rows as [(typeof rows)[number], (typeof rows)[number]]

    const tuti = await loginAs(app, 'tuti.m@ui.ac.id', PW)
    const id = await uploaded(tuti, 'supporting')

    const attached = await tuti.post(`/submissions/${first.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(attached.status).toBe(200)

    const reused = await tuti.post(`/submissions/${second.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(reused.status).toBe(409)
    expect(reused.body.error.code).toBe('document_already_attached')

    const stillThere = await prisma.document.findUniqueOrThrow({ where: { id } })
    expect(stillThere.submissionId).toBe(first.id)
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
