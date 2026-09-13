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
