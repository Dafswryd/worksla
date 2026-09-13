import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'

export const SUBMISSION_INCLUDE = {
  requester: { select: { name: true } },
  documents: true,
  history: { orderBy: { createdAt: 'asc' } },
  checklist: true,
} as const

export const submissionRepo = {
  all: () => prisma.submission.findMany({ include: SUBMISSION_INCLUDE, orderBy: { createdAt: 'desc' } }),
  byCode: (code: string) => prisma.submission.findUnique({ where: { code }, include: SUBMISSION_INCLUDE }),
}

/**
 * Lock the row for the rest of the transaction, then load it with relations.
 * Without this, two tabs pressing "Teruskan" can move a document two stages
 * or fork its history.
 */
export async function lockAndLoad(tx: Prisma.TransactionClient, code: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Submission" WHERE code = ${code} FOR UPDATE
  `
  const id = locked[0]?.id
  if (!id) return null
  return tx.submission.findUnique({ where: { id }, include: SUBMISSION_INCLUDE })
}
