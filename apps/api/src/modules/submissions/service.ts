import type { Category, Role, Stage, Submission } from '@imeri/shared'
import { canAdvance, isHolder, isVisible, nextStage, previousStage } from '@imeri/shared'
import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import type { SubmissionRow } from '../../db/toDomain'
import { BadRequest, Conflict, Forbidden, NotFound } from '../../errors'
import { confirmUploaded } from '../documents/service'
import { loadRoute, loadStages } from '../flowRules/repository'
import { nextCode } from './code'
import { SUBMISSION_INCLUDE, lockAndLoad, submissionRepo } from './repository'

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
 * landed in MinIO is worse than a rejected request. Each id is also checked, inside
 * the same transaction that writes the submission, for ownership (`uploadedById`)
 * and for not already belonging to some other submission — otherwise a stale id
 * from an earlier upload could silently re-point a document that already belongs
 * elsewhere, making it vanish from that other submission.
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

  const documentIds = [input.primaryDocumentId, ...input.supportingDocumentIds]

  for (let attempt = 1; ; attempt++) {
    const code = await prisma.$transaction((tx) => nextCode(tx, input.category))

    try {
      const row = await prisma.$transaction(async (tx) => {
        const documents = await tx.document.findMany({ where: { id: { in: documentIds } } })
        for (const id of documentIds) {
          const document = documents.find((d) => d.id === id)
          if (!document || document.uploadedById !== user.id) throw BadRequest('document_not_owned')
          if (document.submissionId !== null) throw Conflict('document_already_attached')
        }

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

        // Re-checked in the write itself (not just above) to close the TOCTOU
        // window: two concurrent submissions racing on the same stale document
        // id must leave it attached to exactly one of them, never both.
        const updated = await tx.document.updateMany({
          where: { id: { in: documentIds }, uploadedById: user.id, submissionId: null },
          data: { submissionId: submission.id, historyEntryId: entry.id },
        })
        if (updated.count !== documentIds.length) throw Conflict('document_already_attached')

        return tx.submission.findUniqueOrThrow({ where: { id: submission.id }, include: SUBMISSION_INCLUDE })
      })

      return toDomainSubmission(row)
    } catch (error) {
      if (!isCodeCollision(error) || attempt >= MAX_CODE_ATTEMPTS) throw error
    }
  }
}

const ADVANCE_ACTION: Partial<Record<string, string>> = {
  submitter: 'mengajukan ulang setelah perbaikan',
  secretary: 'meneruskan ke Wadir',
  deputy: 'memberi paraf dan meneruskan ke Direktur',
  director: 'menyetujui dan menandatangani',
  recording: 'merekam hasil dan memberi tahu pengaju',
}

const DESK_NAME: Partial<Record<string, string>> = {
  submitter: 'Pengaju',
  secretary: 'Sekret',
  deputy: 'Wadir',
  director: 'Direktur',
  recording: 'Sekret',
}

/**
 * Load, lock, and run the shared rules. Every mutating action goes through here.
 *
 * Two gates, in this order, and the order is load-bearing:
 *
 * 1. `isVisible` → `NotFound`. `isHolder` implies `isVisible` for every role
 *    branch, so this gate never rejects a genuine holder — but it does reject
 *    an actor who is entirely out of scope (wrong category, wrong cluster,
 *    someone else's request) before `isHolder` even runs. That matters for the
 *    *status code*, not just who eventually succeeds: `getVisible` already
 *    returns 404 for an out-of-scope read ("out of scope reads as missing:
 *    403 would confirm the code exists"), and a mutating endpoint must give the
 *    same actor, same document, the same signal — otherwise a 403 on `advance`
 *    would confirm a code exists that the matching `GET` claims not to.
 * 2. `isHolder` → `Forbidden('not_your_desk')`. Once visibility is established,
 *    this is what distinguishes "you can see this desk, it just isn't yours
 *    right now" from being denied outright.
 */
async function guarded<T>(
  code: string,
  role: Role,
  run: (ctx: {
    tx: Prisma.TransactionClient
    row: SubmissionRow
    submission: Submission
    stages: readonly Stage[]
  }) => Promise<T>,
): Promise<T> {
  const stages = await loadStages()
  return prisma.$transaction(async (tx) => {
    const row = await lockAndLoad(tx, code)
    if (!row) throw NotFound()
    const submission = toDomainSubmission(row)
    if (!isVisible(submission, role)) throw NotFound()
    if (!isHolder(submission, role, stages)) throw Forbidden('not_your_desk')
    return run({ tx, row, submission, stages })
  })
}

export async function advance(role: Role, code: string, note?: string): Promise<Submission> {
  return guarded(code, role, async ({ tx, row, submission }) => {
    if (!canAdvance(submission)) throw Conflict('checklist_open')

    const from = row.stageKey
    const to = nextStage(from)
    const finished = to === 'done'

    await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'approve',
        action: ADVANCE_ACTION[from] ?? 'meneruskan berkas',
        ...(note === undefined || note.trim() === '' ? {} : { comment: note.trim() }),
        fromStage: from,
        toStage: to,
      },
    })

    await tx.submission.update({
      where: { id: row.id },
      data: { stageKey: to, status: finished ? 'done' : 'running', stageEnteredAt: new Date() },
    })

    // Checklist rows are deliberately NOT deleted: they belong to the return that
    // created them. Moving to `running` is what makes them stop being active.

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}

export async function sendBack(role: Role, code: string, comment: string): Promise<Submission> {
  const points = comment
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (points.length === 0) throw BadRequest('comment_required')

  return guarded(code, role, async ({ tx, row }) => {
    const from = row.stageKey
    const to = previousStage(from)

    const entry = await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'return',
        action: `mengembalikan ke ${DESK_NAME[to] ?? 'meja sebelumnya'}`,
        comment: `${points.join('. ')}.`,
        fromStage: from,
        toStage: to,
      },
    })

    // Earlier rounds stay on their own return entry; this creates a new set.
    await tx.checklistItem.createMany({
      data: points.map((text) => ({ historyEntryId: entry.id, submissionId: row.id, text })),
    })

    await tx.submission.update({
      where: { id: row.id },
      data: { stageKey: to, status: 'returned', stageEnteredAt: new Date() },
    })

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}

export async function toggleChecklistItem(
  role: Role,
  code: string,
  itemId: string,
  done: boolean,
): Promise<Submission> {
  return guarded(code, role, async ({ tx, row }) => {
    const item = row.checklist.find((c) => c.id === itemId)
    if (!item) throw NotFound()

    await tx.checklistItem.update({
      where: { id: itemId },
      data: { done, doneAt: done ? new Date() : null, doneById: done ? role.id : null },
    })

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}
