import type {
  ChecklistItem as DbChecklistItem,
  Document as DbDocument,
  HistoryEntry as DbHistoryEntry,
  Submission as DbSubmission,
  User as DbUser,
} from '@prisma/client'
import type { Attachment, ChecklistItem, Role, Submission, TrailEntry } from '@imeri/shared'

const MS_PER_DAY = 86_400_000

/** Day counter for a desk: the first day counts as 1, matching the screen label "hari 1/2". */
export function daysSince(from: Date, now: Date = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - from.getTime()) / MS_PER_DAY) + 1)
}

export type SubmissionRow = DbSubmission & {
  requester: Pick<DbUser, 'name'>
  documents: DbDocument[]
  history: DbHistoryEntry[]
  checklist: DbChecklistItem[]
}

const toAttachment = (doc: DbDocument): Attachment => ({
  name: doc.name,
  type: doc.name.toLowerCase().endsWith('.xlsx') || doc.name.toLowerCase().endsWith('.xls') ? 'xls' : 'pdf',
  size: `${Math.round(doc.sizeBytes / 1024)} KB`,
})

const toTrailEntry = (entry: DbHistoryEntry): TrailEntry => ({
  actor: entry.actorName,
  role: entry.actorPosition,
  action: entry.action,
  time: entry.createdAt.toISOString(),
  kind: entry.kind,
  ...(entry.comment === null ? {} : { comment: entry.comment }),
})

const toChecklistItem = (item: DbChecklistItem): ChecklistItem => ({ text: item.text, done: item.done })

/**
 * Checklist rows are never deleted — they belong to the return that created them,
 * so "what did the secretary ask for back then?" stays answerable. The *active*
 * checklist is only the newest return's items, and only while the document is
 * still in the returned state.
 */
function activeChecklist(row: SubmissionRow): readonly DbChecklistItem[] {
  if (row.status !== 'returned') return []
  const lastReturn = [...row.history].reverse().find((entry) => entry.kind === 'return')
  if (!lastReturn) return []
  return row.checklist.filter((item) => item.historyEntryId === lastReturn.id)
}

/** Prisma row → the shared domain type the flow rules operate on. */
export function toDomainSubmission(row: SubmissionRow, now: Date = new Date()): Submission {
  return {
    code: row.code,
    title: row.title,
    requester: row.requester.name,
    requesterId: row.requesterId,
    cluster: row.cluster,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    stageKey: row.stageKey,
    daysInStage: row.status === 'done' ? 0 : daysSince(row.stageEnteredAt, now),
    status: row.status,
    attachments: row.documents.filter((doc) => doc.status === 'ready' && doc.isCurrent).map(toAttachment),
    checklist: activeChecklist(row).map(toChecklistItem),
    history: row.history.map(toTrailEntry),
  }
}

export const toDomainRole = (user: DbUser): Role => ({
  id: user.id,
  name: user.name,
  type: user.type,
  position: user.position,
  initials: user.initials,
  ...(user.category === null ? {} : { category: user.category }),
  ...(user.cluster === null ? {} : { cluster: user.cluster }),
})
