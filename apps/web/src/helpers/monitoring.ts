import { isOverdue, stageAt } from '@imeri/shared'
import { roleById } from '@/constants/roles'
import { STAFF } from '@/constants/staff'
import { initialsOf, percent } from './format'
import type { CategoryRoute, Role, Stage, Staff, Submission } from '@/types'

export interface Holder {
  readonly name: string
  readonly initials: string
  readonly position: string
}

/** Who is holding this document right now. */
export function holderOf(submission: Submission, stages: readonly Stage[], route: CategoryRoute): Holder {
  if (submission.status === 'done') return { name: '—', initials: '✓', position: 'Arsip' }

  const stage = stageAt(stages, submission.stageIndex)
  if (stage.key === 'submitter') {
    return { name: submission.requester, initials: initialsOf(submission.requester), position: 'menunggu perbaikan' }
  }
  if (stage.key === 'secretary' || stage.key === 'recording') {
    const secretary = roleById(route[submission.category])
    return { name: secretary.name, initials: secretary.initials, position: secretary.position }
  }
  if (stage.key === 'deputy') {
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
  readonly index: number
  readonly count: number
  readonly overdue: number
}

/** How many documents are piled up at each desk, and how many of those are late. */
export function backlogByStage(active: readonly Submission[], stages: readonly Stage[]): readonly BacklogRow[] {
  return stages.slice(0, stages.length - 1).map((stage, index) => {
    const atDesk = active.filter((item) => item.stageIndex === index)
    return { stage, index, count: atDesk.length, overdue: atDesk.filter((item) => isOverdue(item, stages)).length }
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
  route: CategoryRoute,
  role: Role,
): readonly WorkloadRow[] {
  const people =
    role.type === 'monitor' ? STAFF.filter((item) => item.type !== 'submitter' || item.scope === role.cluster) : STAFF

  return people.map((staff) => {
    const held = list.filter(
      (item) => item.status !== 'done' && holderOf(item, stages, route).name === staff.name,
    )
    return {
      staff,
      count: held.length,
      overdue: held.filter((item) => isOverdue(item, stages)).length,
    }
  })
}
