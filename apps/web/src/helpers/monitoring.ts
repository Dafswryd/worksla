import { isOverdue, stageByKey } from '@imeri/shared'
import { roleById } from '@/constants/roles'
import { STAFF } from '@/constants/staff'
import { STAGE_LABEL } from '@/constants/stages'
import { initialsOf, percent } from './format'
import type { Role, Stage, Staff, Submission } from '@/types'

export interface Holder {
  readonly name: string
  readonly initials: string
  readonly position: string
}

/**
 * Who is holding this document right now.
 *
 * The secretary comes from the submission's own stored assignment, not from the
 * current category route: those two answers part company the moment the super
 * admin re-routes a category, and the stored one is what the permission rules
 * in `@imeri/shared` read. Display and permission must never disagree.
 */
export function holderOf(submission: Submission, stages: readonly Stage[]): Holder {
  if (submission.status === 'done') return { name: '—', initials: '✓', position: 'Arsip' }

  const { key } = stageByKey(stages, submission.stageKey)
  if (key === 'submitter') {
    return { name: submission.requester, initials: initialsOf(submission.requester), position: 'menunggu perbaikan' }
  }
  if (key === 'secretary' || key === 'recording') {
    const secretary = roleById(submission.assignedSecretaryId)
    return { name: secretary.name, initials: secretary.initials, position: secretary.position }
  }
  if (key === 'deputy') {
    const deputy = roleById('hendra')
    return { name: deputy.name, initials: deputy.initials, position: 'QC & paraf' }
  }
  const director = roleById('ratna')
  return { name: director.name, initials: director.initials, position: 'Persetujuan' }
}

export interface MonitorSummary {
  readonly active: readonly Submission[]
  readonly overdue: readonly Submission[]
  readonly returned: readonly Submission[]
  readonly done: readonly Submission[]
  readonly overdueRatio: number
  readonly returnRatio: number
}

/** The headline numbers on the monitoring board. */
export function summarize(list: readonly Submission[], stages: readonly Stage[]): MonitorSummary {
  const active = list.filter((item) => item.status !== 'done')
  const overdue = active.filter((item) => isOverdue(item, stages))
  return {
    active,
    overdue,
    returned: list.filter((item) => item.status === 'returned'),
    done: list.filter((item) => item.status === 'done'),
    overdueRatio: percent(overdue.length, active.length),
    returnRatio: percent(list.filter((item) => item.status === 'returned').length, list.length),
  }
}

export interface BacklogRow {
  readonly stage: Stage
  readonly desk: string
  readonly action: string
  readonly count: number
  readonly overdue: number
}

/** How many documents are piled up at each desk, and how many of those are late. */
export function backlogByStage(active: readonly Submission[], stages: readonly Stage[]): readonly BacklogRow[] {
  return stages
    .filter((stage) => stage.key !== 'done')
    .map((stage) => {
      const atDesk = active.filter((item) => item.stageKey === stage.key)
      return {
        stage,
        desk: STAGE_LABEL[stage.key].desk,
        action: STAGE_LABEL[stage.key].action,
        count: atDesk.length,
        overdue: atDesk.filter((item) => isOverdue(item, stages)).length,
      }
    })
}

export interface WorkloadRow {
  readonly staff: Staff
  readonly count: number
  readonly overdue: number
}

/**
 * Workload per staff member. The "at desk" column is derived from the document
 * list rather than a stored number, so it always agrees with the backlog board.
 */
export function workloadRows(
  list: readonly Submission[],
  stages: readonly Stage[],
  role: Role,
): readonly WorkloadRow[] {
  const people =
    role.type === 'monitor' ? STAFF.filter((item) => item.type !== 'submitter' || item.scope === role.cluster) : STAFF

  return people.map((staff) => {
    const held = list.filter(
      (item) => item.status !== 'done' && holderOf(item, stages).name === staff.name,
    )
    return {
      staff,
      count: held.length,
      overdue: held.filter((item) => isOverdue(item, stages)).length,
    }
  })
}
