import type { Category, CategoryRoute, Role, Stage, Submission } from './types'

/**
 * Flow rules — deliberately pure (no React, no global state) so the backend can
 * reuse them verbatim once server-side validation is built.
 */

/** Read the stage at a given index, clamped to the valid range. */
export function stageAt(stages: readonly Stage[], index: number): Stage {
  const safe = Math.min(Math.max(index, 0), stages.length - 1)
  const stage = stages[safe]
  if (!stage) throw new Error('Stage list is empty')
  return stage
}

/** Read-only roles: super admin and cluster monitor. */
export const isObserver = (role: Role): boolean => role.type === 'admin' || role.type === 'monitor'

/** Whether this document falls within the role's scope. */
export function isVisible(submission: Submission, role: Role): boolean {
  if (role.type === 'submitter') return submission.requesterId === role.id
  if (role.type === 'secretary') return submission.category === role.category
  if (role.type === 'monitor') return submission.cluster === role.cluster
  return true
}

/** Whether the ball is in this role's court right now. */
export function isHolder(submission: Submission, role: Role, stages: readonly Stage[]): boolean {
  if (submission.status === 'done') return false
  const stage = stageAt(stages, submission.stageIndex)
  if (stage.key === 'submitter') return role.type === 'submitter' && submission.requesterId === role.id
  if (stage.key === 'secretary' || stage.key === 'recording') {
    return role.type === 'secretary' && submission.category === role.category
  }
  if (stage.key === 'deputy') return role.type === 'deputy'
  if (stage.key === 'director') return role.type === 'director'
  return false
}

/** The document has passed its stage deadline. */
export function isOverdue(submission: Submission, stages: readonly Stage[]): boolean {
  if (submission.status === 'done') return false
  const { sla } = stageAt(stages, submission.stageIndex)
  return sla !== null && submission.daysInStage > sla
}

/** Days past the deadline; 0 when still within it. */
export function overdueDays(submission: Submission, stages: readonly Stage[]): number {
  const { sla } = stageAt(stages, submission.stageIndex)
  if (sla === null || submission.status === 'done') return 0
  return Math.max(0, submission.daysInStage - sla)
}

/** The secretary handling one category, per the active route. */
export const secretaryFor = (route: CategoryRoute, category: Category): string => route[category]

/** Every revision checklist item is closed (or there are none). */
export const checklistCleared = (submission: Submission): boolean =>
  submission.checklist.length === 0 || submission.checklist.every((item) => item.done)

/** A returned document may not move on until its checklist is closed. */
export const canAdvance = (submission: Submission): boolean =>
  submission.status !== 'returned' || checklistCleared(submission)
