import type { DocumentKind } from '@prisma/client'
import { prisma } from '../../db/client'
import { SUBMISSION_INCLUDE } from '../submissions/repository'

export interface NewDocument {
  readonly id: string
  readonly kind: DocumentKind
  readonly lineageId: string
  readonly name: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly storageKey: string
  readonly uploadedById: string
}

export const documentRepo = {
  create: (data: NewDocument) =>
    prisma.document.create({
      data: { ...data, version: 1, isCurrent: true, status: 'pending' },
    }),
  byId: (id: string) => prisma.document.findUnique({ where: { id } }),
  /** Uploads that were issued a presigned URL and never confirmed. */
  pendingOlderThan: (cutoff: Date) =>
    prisma.document.findMany({ where: { status: 'pending', createdAt: { lt: cutoff } } }),
  submissionById: (id: string) => prisma.submission.findUnique({ where: { id }, include: SUBMISSION_INCLUDE }),
  markReady: (id: string, sizeBytes: number) =>
    prisma.document.update({ where: { id }, data: { status: 'ready', sizeBytes } }),
  delete: (id: string) => prisma.document.delete({ where: { id } }),
}
