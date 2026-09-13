import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { cleanupOrphans } from '../src/jobs/cleanupOrphans'
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

describe('cleanupOrphans', () => {
  it('menghapus dokumen pending yang sudah tua', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'yatim.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    await prisma.document.update({
      where: { id: res.body.documentId },
      data: { createdAt: new Date(Date.now() - 48 * 3_600_000) },
    })

    expect(await cleanupOrphans(24)).toBe(1)
    expect(await prisma.document.findUnique({ where: { id: res.body.documentId } })).toBeNull()
  })

  it('tidak menyentuh dokumen pending yang masih baru', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'baru.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    expect(await cleanupOrphans(24)).toBe(0)
    expect(await prisma.document.findUnique({ where: { id: res.body.documentId } })).not.toBeNull()
  })

  it('tidak menyentuh dokumen yang sudah ready', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'jadi.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })
    await prisma.document.update({
      where: { id: res.body.documentId },
      data: { status: 'ready', createdAt: new Date(Date.now() - 48 * 3_600_000) },
    })

    expect(await cleanupOrphans(24)).toBe(0)
  })
})
