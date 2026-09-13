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

/** A secretary-stage submission outside Nadia's cluster (HCRC). */
async function atSecretaryOutsideHcrc(): Promise<string> {
  const row = await prisma.submission.findFirstOrThrow({
    where: { stageKey: 'secretary', status: 'running', cluster: { not: 'HCRC' } },
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

  it('monitor di dalam klasternya sendiri tetap tidak bisa meneruskan', async () => {
    const code = await atSecretary() // finance/secretary, cluster HCRC — Nadia's own cluster
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('not_your_desk')
  })

  it('monitor di luar klasternya mendapat 404, bukan 403', async () => {
    const code = await atSecretaryOutsideHcrc()
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
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
    // Actually send the document back first — reading a seeded `returned` row
    // and asserting its stage proves nothing about `/return`, it only restates
    // the fixture.
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const back = await sari.post(`/submissions/${code}/return`).send({ comment: 'Perbaiki tanggal di form' })
    expect(back.status).toBe(200)
    expect(back.body.stageKey).toBe('submitter')

    // Now the requester holds it at the first stage. There is no desk behind
    // this one, so `/return` has nowhere to send it — and must not invent a
    // self-addressed return entry with a fresh blocking checklist.
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const again = await rina.post(`/submissions/${code}/return`).send({ comment: 'Coba mundur lagi' })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('already_at_first_stage')

    const row = await prisma.submission.findUniqueOrThrow({
      where: { code },
      include: { history: true, checklist: true },
    })
    expect(row.stageKey).toBe('submitter')
    expect(row.history.every((entry) => entry.fromStage !== entry.toStage || entry.kind !== 'return')).toBe(true)
    expect(row.checklist).toHaveLength(1)
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

  it('poin dari ronde pengembalian yang sudah ditutup tidak bisa diubah lagi', async () => {
    // Checklist rows are never deleted (§2.8) — they belong to the return that
    // created them. Only the newest return's items are live; reopening a point
    // from an earlier round would rewrite a closed piece of the record.
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    // Round one: two points, both closed by the requester, then forwarded.
    await sari.post(`/submissions/${code}/return`).send({ comment: 'Poin ronde satu A\nPoin ronde satu B' })
    const row = await prisma.submission.findUniqueOrThrow({ where: { code }, include: { checklist: true } })
    const firstRound = row.checklist.map((item) => item.id)
    expect(firstRound).toHaveLength(2)
    for (const id of firstRound) {
      expect((await rina.patch(`/submissions/${code}/checklist/${id}`).send({ done: true })).status).toBe(200)
    }
    expect((await rina.post(`/submissions/${code}/advance`).send({})).status).toBe(200)

    // Round two: a new return creates a new, separate set.
    await sari.post(`/submissions/${code}/return`).send({ comment: 'Poin ronde dua' })
    const after = await prisma.submission.findUniqueOrThrow({ where: { code }, include: { checklist: true } })
    const secondRound = after.checklist.filter((item) => !firstRound.includes(item.id))
    expect(secondRound).toHaveLength(1)

    // Round one's ids are no longer live: 404, the same answer any unknown id gets.
    const stale = await rina.patch(`/submissions/${code}/checklist/${firstRound[0] as string}`).send({ done: false })
    expect(stale.status).toBe(404)
    expect(stale.body.error.code).toBe('not_found')

    const untouched = await prisma.checklistItem.findUniqueOrThrow({ where: { id: firstRound[0] as string } })
    expect(untouched.done).toBe(true)

    // The current round is still perfectly writable.
    const live = await rina.patch(`/submissions/${code}/checklist/${secondRound[0]!.id}`).send({ done: true })
    expect(live.status).toBe(200)
  })

  it('sekret dalam cakupan tapi bukan pemegang berkas ditolak 403', async () => {
    // Returned to `submitter` stage, held by the requester — not by Budi, even
    // though he is the personnel secretary and can see the submission fine.
    const row = await prisma.submission.findFirstOrThrow({
      where: { status: 'returned', category: 'personnel' },
      include: { checklist: true },
    })
    const budi = await loginAs(app, 'budi.s@ui.ac.id', PW)
    const res = await budi.patch(`/submissions/${row.code}/checklist/${row.checklist[0]!.id}`).send({ done: true })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('not_your_desk')
  })

  it('sekret di luar cakupan mendapat 404, sama seperti GET', async () => {
    // Sari is a finance secretary; this submission is personnel — out of her
    // scope entirely, not merely "not her desk". A mutating endpoint must give
    // the same actor, same document, the same signal the read endpoint does.
    const row = await prisma.submission.findFirstOrThrow({
      where: { status: 'returned', category: 'personnel' },
      include: { checklist: true },
    })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)

    const patchRes = await sari.patch(`/submissions/${row.code}/checklist/${row.checklist[0]!.id}`).send({ done: true })
    const getRes = await sari.get(`/submissions/${row.code}`)

    expect(patchRes.status).toBe(getRes.status)
    expect(patchRes.body.error.code).toBe(getRes.body.error.code)
    expect(patchRes.status).toBe(404)
    expect(patchRes.body.error.code).toBe('not_found')
  })
})
