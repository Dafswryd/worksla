import type { Category, Role, Submission } from '@imeri/shared'
import { isVisible } from '@imeri/shared'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import { BadRequest, Forbidden, NotFound } from '../../errors'
import { confirmUploaded } from '../documents/service'
import { loadRoute } from '../flowRules/repository'
import { nextCode } from './code'
import { SUBMISSION_INCLUDE, submissionRepo } from './repository'

/** Scope is always derived from the session — never from a request parameter. */
export async function listVisible(role: Role): Promise<readonly Submission[]> {
  const rows = await submissionRepo.all()
  return rows.map((row) => toDomainSubmission(row)).filter((item) => isVisible(item, role))
}

/** Out of scope reads as missing: 403 would confirm the code exists. */
export async function getVisible(code: string, role: Role): Promise<Submission> {
  const row = await submissionRepo.byCode(code)
  if (!row) throw NotFound()
  const submission = toDomainSubmission(row)
  if (!isVisible(submission, role)) throw NotFound()
  return submission
}

export interface CreateInput {
  readonly title: string
  readonly category: Category
  readonly summary?: string | undefined
  readonly primaryDocumentId: string
  readonly supportingDocumentIds: readonly string[]
}

/** True for a P2002 unique-constraint violation on Submission.code specifically. */
function isCodeCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as readonly string[]).includes('code')
  )
}

/**
 * `prisma/seed.ts` seeds `CodeCounter` above every code it hardcodes, so this only
 * ever needs to cover a genuine concurrent race (two requests allocating at the
 * same instant), not a pre-existing, permanently-taken number — 10 is generous
 * headroom for that case.
 */
const MAX_CODE_ATTEMPTS = 10

/**
 * The secretary is resolved from the active route once, at creation, and stored on
 * the row as `assignedSecretaryId`. A later change to the category route must never
 * move a submission that is already running, so nothing here re-reads the route
 * after this point.
 *
 * Every document id is verified with `confirmUploaded` (real object in the store,
 * real size) before the submission is written — a reference to an object that never
 * landed in MinIO is worse than a rejected request.
 *
 * Code allocation runs as its own small transaction, separate from the submission
 * write: `nextCode`'s increment must survive even when the write that follows it
 * fails, or a retry would just recompute the identical, still-colliding code forever
 * (this is exactly what happens with fixture data — a handful of `code`s for the
 * current month are pre-seeded without the counter, so the first few real numbers
 * are guaranteed to already be taken). `Submission.code`'s unique constraint is the
 * actual defence against a collision; on a hit, a fresh code is allocated and the
 * write retried, bounded by `MAX_CODE_ATTEMPTS`.
 */
export async function createSubmission(user: Role, input: CreateInput): Promise<Submission> {
  if (user.type !== 'submitter') throw Forbidden('not_your_desk')

  await confirmUploaded(input.primaryDocumentId)
  for (const id of input.supportingDocumentIds) await confirmUploaded(id)

  const route = await loadRoute()
  const assignedSecretaryId = route[input.category]
  if (!assignedSecretaryId) throw BadRequest()

  for (let attempt = 1; ; attempt++) {
    const code = await prisma.$transaction((tx) => nextCode(tx, input.category))

    try {
      const row = await prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({
          data: {
            code,
            title: input.title,
            ...(input.summary === undefined ? {} : { summary: input.summary }),
            requesterId: user.id,
            assignedSecretaryId,
            cluster: user.cluster ?? 'HCRC',
            category: input.category,
            stageKey: 'secretary',
            status: 'running',
            stageEnteredAt: new Date(),
          },
        })

        const entry = await tx.historyEntry.create({
          data: {
            submissionId: submission.id,
            actorId: user.id,
            actorName: user.name,
            actorPosition: user.position,
            kind: 'submit',
            action: 'mengirim pengajuan',
            ...(input.summary === undefined ? {} : { comment: input.summary }),
            fromStage: 'submitter',
            toStage: 'secretary',
          },
        })

        await tx.document.updateMany({
          where: { id: { in: [input.primaryDocumentId, ...input.supportingDocumentIds] } },
          data: { submissionId: submission.id, historyEntryId: entry.id },
        })

        return tx.submission.findUniqueOrThrow({ where: { id: submission.id }, include: SUBMISSION_INCLUDE })
      })

      return toDomainSubmission(row)
    } catch (error) {
      if (!isCodeCollision(error) || attempt >= MAX_CODE_ATTEMPTS) throw error
    }
  }
}
