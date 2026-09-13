import { randomUUID } from 'node:crypto'
import type { Role, Submission } from '@imeri/shared'
import { isHolder, isVisible } from '@imeri/shared'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import { BadRequest, Forbidden, NotFound } from '../../errors'
import { env } from '../../env'
import { loadStages } from '../flowRules/repository'
import { SUBMISSION_INCLUDE, lockAndLoad } from '../submissions/repository'
import { ALLOWED_CONTENT_TYPES } from '../../storage/FileStore'
import { s3Store } from '../../storage/s3Store'
import { documentRepo } from './repository'

/** Storage keys are always built by the server: UUID-based, sanitised, never client-supplied. */
export function buildStorageKey(filename: string): string {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const base = filename.split(/[\\/]/).pop() ?? 'berkas'
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'

  const slug =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'berkas'

  return `submissions/${year}/${month}/${randomUUID()}/${slug}.${ext}`
}

export interface UploadRequest {
  readonly filename: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly kind: 'primary' | 'supporting'
}

export async function requestUpload(user: Role, input: UploadRequest) {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) throw BadRequest('unsupported_file_type')
  if (input.sizeBytes > env.MAX_UPLOAD_BYTES) throw BadRequest('file_too_large')

  const storageKey = buildStorageKey(input.filename)
  const id = randomUUID()

  const document = await documentRepo.create({
    id,
    kind: input.kind,
    lineageId: id,
    name: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    storageKey,
    uploadedById: user.id,
  })

  const { url, expiresIn } = await s3Store.presignUpload(storageKey, input.contentType)
  return { documentId: document.id, uploadUrl: url, expiresIn }
}

const DOWNLOAD_TTL = 60

export async function downloadUrlFor(documentId: string, role: Role): Promise<string> {
  const document = await documentRepo.byId(documentId)
  if (!document || document.status !== 'ready' || !document.submissionId) throw NotFound()

  const row = await documentRepo.submissionById(document.submissionId)
  if (!row || !isVisible(toDomainSubmission(row), role)) throw NotFound()

  return s3Store.presignDownload(document.storageKey, document.name, DOWNLOAD_TTL)
}

/** Verify the object really landed, and that its real size is within the limit. */
export async function confirmUploaded(documentId: string): Promise<void> {
  const document = await documentRepo.byId(documentId)
  if (!document) throw BadRequest('document_not_uploaded')

  const meta = await s3Store.head(document.storageKey)
  if (!meta) throw BadRequest('document_not_uploaded')

  if (meta.sizeBytes > env.MAX_UPLOAD_BYTES) {
    await s3Store.delete(document.storageKey)
    await documentRepo.delete(documentId)
    throw BadRequest('file_too_large')
  }

  await documentRepo.markReady(documentId, meta.sizeBytes)
}

/**
 * The primary document is frozen once the secretary forwards it: otherwise the
 * deputy and director could initial one file and have its contents change behind
 * them. Revision has to go through the official route — returned first.
 */
export async function attachDocument(
  role: Role,
  code: string,
  documentId: string,
  kind: 'primary' | 'supporting',
  note?: string,
): Promise<Submission> {
  await confirmUploaded(documentId)
  const stages = await loadStages()

  return prisma.$transaction(async (tx) => {
    const row = await lockAndLoad(tx, code)
    if (!row) throw NotFound()
    const submission = toDomainSubmission(row)
    if (!isVisible(submission, role)) throw NotFound()

    if (kind === 'primary') {
      if (role.id !== row.requesterId || row.stageKey !== 'submitter') {
        throw Forbidden('primary_document_frozen')
      }
    } else if (!isHolder(submission, role, stages)) {
      throw Forbidden('not_your_desk')
    }

    const previous = await tx.document.findFirst({
      where: { submissionId: row.id, kind, isCurrent: true },
      orderBy: { version: 'desc' },
    })

    // Seed data backdates/forward-dates history entries deliberately (see
    // prisma/seed.ts) so demo submissions look like they took days, which can
    // put a seeded entry's `createdAt` ahead of the real "now". A newly created
    // entry must still sort after every entry that already exists, so its
    // timestamp is pinned to whichever is later.
    const latestExisting = row.history.reduce((max, item) => Math.max(max, item.createdAt.getTime()), 0)
    const createdAt = new Date(Math.max(Date.now(), latestExisting + 1))

    const entry = await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'submit',
        action:
          kind === 'primary'
            ? `mengunggah dokumen pengajuan v${(previous?.version ?? 0) + 1}`
            : 'melampirkan dokumen pendamping',
        ...(note === undefined || note.trim() === '' ? {} : { comment: note.trim() }),
        fromStage: row.stageKey,
        toStage: row.stageKey,
        createdAt,
      },
    })

    if (kind === 'primary' && previous) {
      await tx.document.update({ where: { id: previous.id }, data: { isCurrent: false } })
      await tx.document.update({
        where: { id: documentId },
        data: {
          submissionId: row.id,
          historyEntryId: entry.id,
          lineageId: previous.lineageId,
          version: previous.version + 1,
          isCurrent: true,
        },
      })
    } else {
      await tx.document.update({
        where: { id: documentId },
        data: { submissionId: row.id, historyEntryId: entry.id, isCurrent: true },
      })
    }

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}
