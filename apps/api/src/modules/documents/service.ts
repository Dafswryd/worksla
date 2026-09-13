import { randomUUID } from 'node:crypto'
import type { Role } from '@imeri/shared'
import { isVisible } from '@imeri/shared'
import { toDomainSubmission } from '../../db/toDomain'
import { BadRequest, NotFound } from '../../errors'
import { env } from '../../env'
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
