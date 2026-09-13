import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

/** A finance submission sitting on Sari's desk. */
async function atSecretary(): Promise<string> {
  const row = await prisma.submission.findFirstOrThrow({
    where: { category: 'finance', stageKey: 'secretary', status: 'running' },
  })
  return row.code
}

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /submissions/:code/advance', () => {
  it('pemegang berkas bisa meneruskan, tahapnya maju satu', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(200)
    expect(res.body.stageKey).toBe('deputy')
    expect(res.body.daysInStage).toBe(1)
  })

  it('bukan pemegang berkas ditolak 403', async () => {
    const code = await atSecretary()
    const hendra = await loginAs(app, 'hendra.w@ui.ac.id', PW)
    const res = await hendra.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('not_your_desk')
  })

  it('monitor tidak bisa meneruskan apa pun', async () => {
    const code = await atSecretary()
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.post(`/submissions/${code}/advance`).send({})
    expect([403, 404]).toContain(res.status)
  })

  it('catatan opsional tercatat di riwayat tanpa menjadi checklist', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/advance`).send({ note: 'Harga vendor B lebih masuk akal' })

    const last = res.body.history[res.body.history.length - 1]
    expect(last.comment).toBe('Harga vendor B lebih masuk akal')
    expect(res.body.checklist).toHaveLength(0)
  })

  it('dari recording menjadi selesai', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { category: 'finance', status: 'running' } })
    await prisma.submission.update({ where: { id: row.id }, data: { stageKey: 'recording' } })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${row.code}/advance`).send({})
    expect(res.body.stageKey).toBe('done')
    expect(res.body.status).toBe('done')
  })

  it('dua advance bersamaan: satu berhasil, satu gagal', async () => {
    const code = await atSecretary()
    const a = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const b = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const results = await Promise.all([
      a.post(`/submissions/${code}/advance`).send({}),
      b.post(`/submissions/${code}/advance`).send({}),
    ])
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)

    const row = await prisma.submission.findUniqueOrThrow({ where: { code } })
    expect(row.stageKey).toBe('deputy')
  })
})

describe('POST /submissions/:code/return', () => {
  it('mundur tepat satu langkah dan komentarnya jadi checklist', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari
      .post(`/submissions/${code}/return`)
      .send({ comment: 'Lampirkan surat persetujuan\nPerbaiki tanggal di form' })

    expect(res.status).toBe(200)
    expect(res.body.stageKey).toBe('submitter')
    expect(res.body.status).toBe('returned')
    expect(res.body.checklist).toHaveLength(2)
    expect(res.body.checklist.every((c: { done: boolean }) => !c.done)).toBe(true)
  })

  it('tidak pernah mundur melewati tahap pertama', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    expect(row.stageKey).toBe('submitter')
  })

  it('komentar kosong ditolak', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/return`).send({ comment: '   \n  \n ' })
    expect(res.body.error.code).toBe('comment_required')
  })
})

describe('checklist mengunci', () => {
  it('berkas dikembalikan tidak bisa diteruskan sebelum semua poin ditutup', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { status: 'returned' },
      include: { checklist: true, requester: true },
    })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    const blocked = await rina.post(`/submissions/${row.code}/advance`).send({})
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('checklist_open')

    for (const item of row.checklist) {
      await rina.patch(`/submissions/${row.code}/checklist/${item.id}`).send({ done: true })
    }

    const ok = await rina.post(`/submissions/${row.code}/advance`).send({})
    expect(ok.status).toBe(200)
    expect(ok.body.stageKey).toBe('secretary')
    expect(ok.body.checklist).toHaveLength(0)
  })

  it('orang yang tidak memegang berkas tidak bisa mencentang', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' }, include: { checklist: true } })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.patch(`/submissions/${row.code}/checklist/${row.checklist[0]!.id}`).send({ done: true })
    expect(res.status).toBe(403)
  })
})
