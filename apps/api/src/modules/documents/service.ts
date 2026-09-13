import { randomUUID } from 'node:crypto'
import type { Role, Stage, Submission } from '@imeri/shared'
import { isHolder, isVisible } from '@imeri/shared'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import type { SubmissionRow } from '../../db/toDomain'
import { BadRequest, Conflict, Forbidden, NotFound } from '../../errors'
import { env } from '../../env'
import { loadStages } from '../flowRules/repository'
import { SUBMISSION_INCLUDE, lockAndLoad, submissionRepo } from '../submissions/repository'
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

/**
 * Verify the object really landed, and that its real size is within the limit.
 *
 * Ownership is settled first, before anything else happens: the oversize branch
 * below deletes the stored object AND the row, and `markReady` mutates it, so
 * an id alone must never be enough to reach either. UUID ids make guessing
 * someone else's document impractical, but "hard to guess" is not an
 * authorization check — `ownerId` is.
 */
export async function confirmUploaded(documentId: string, ownerId: string): Promise<void> {
  const document = await documentRepo.byId(documentId)
  if (!document) throw BadRequest('document_not_uploaded')
  if (document.uploadedById !== ownerId) throw BadRequest('document_not_owned')

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
function assertMayAttach(
  role: Role,
  row: SubmissionRow,
  kind: 'primary' | 'supporting',
  stages: readonly Stage[],
): void {
  const submission = toDomainSubmission(row)
  if (!isVisible(submission, role)) throw NotFound()

  if (kind === 'primary') {
    if (role.id !== row.requesterId || row.stageKey !== 'submitter') {
      throw Forbidden('primary_document_frozen')
    }
  } else if (!isHolder(submission, role, stages)) {
    throw Forbidden('not_your_desk')
  }
}

export async function attachDocument(
  role: Role,
  code: string,
  documentId: string,
  kind: 'primary' | 'supporting',
  note?: string,
): Promise<Submission> {
  const stages = await loadStages()

  // Authorization comes before `confirmUploaded`, never after: that call has
  // side effects on the document it is handed (marking it ready, or deleting
  // object and row when the real size is over the limit), so an actor who may
  // not write here must be turned away before reaching it. This unlocked read
  // decides nothing on its own — the locked transaction below repeats the same
  // check and is what actually settles the outcome — it only keeps the check
  // ahead of the side effect without holding a row lock across S3 round-trips.
  const preview = await submissionRepo.byCode(code)
  if (!preview) throw NotFound()
  assertMayAttach(role, preview, kind, stages)

  await confirmUploaded(documentId, role.id)

  return prisma.$transaction(async (tx) => {
    const row = await lockAndLoad(tx, code)
    if (!row) throw NotFound()
    assertMayAttach(role, row, kind, stages)

    // Document ids are only ever handed to the client that uploaded them (via
    // POST /documents/upload-url), so this is mainly a guard against a stale
    // id from a previous, unrelated submission — not discoverable cross-user,
    // but an easy accident: silently re-pointing someone's already-attached
    // document here would make it vanish from wherever it actually belongs.
    const document = await tx.document.findUnique({ where: { id: documentId } })
    if (!document || document.uploadedById !== role.id) throw BadRequest('document_not_owned')
    if (document.submissionId !== null) throw Conflict('document_already_attached')

    const previous = await tx.document.findFirst({
      where: { submissionId: row.id, kind, isCurrent: true },
      orderBy: { version: 'desc' },
    })

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
      },
    })

    // Re-checked in the write itself (not just above) to close the TOCTOU
    // window: two concurrent attaches racing on the same stale document id
    // must leave exactly one of them attached, never both.
    const claim = { id: documentId, uploadedById: role.id, submissionId: null }
    let updated: { count: number }
    if (kind === 'primary' && previous) {
      await tx.document.update({ where: { id: previous.id }, data: { isCurrent: false } })
      updated = await tx.document.updateMany({
        where: claim,
        data: {
          submissionId: row.id,
          historyEntryId: entry.id,
          lineageId: previous.lineageId,
          version: previous.version + 1,
          isCurrent: true,
        },
      })
    } else {
      updated = await tx.document.updateMany({
        where: claim,
        data: { submissionId: row.id, historyEntryId: entry.id, isCurrent: true },
      })
    }
    if (updated.count !== 1) throw Conflict('document_already_attached')

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}
