/** Domain types for the IMERI document submission flow — shared by web and (later) api. */

export type Category = 'finance' | 'personnel' | 'general'

export type Cluster = 'HCRC' | 'MedTech' | 'StemCell' | 'DrugDevelopment'

/** The six stages a document passes through, in order. */
export type StageKey = 'submitter' | 'secretary' | 'deputy' | 'director' | 'recording' | 'done'

export type SubmissionStatus = 'running' | 'returned' | 'done'

export type RoleType = 'submitter' | 'secretary' | 'deputy' | 'director' | 'admin' | 'monitor'

export type TrailKind = 'submit' | 'approve' | 'return'

/** A staff member is either tied to one cluster or works across all of them. */
export type StaffScope = Cluster | 'cross-cluster'

export interface Stage {
  readonly key: StageKey
  /** Day limit for this stage; null means unbounded. */
  readonly sla: number | null
}

export interface Attachment {
  readonly name: string
  readonly type: 'pdf' | 'xls'
  readonly size: string
}

export interface ChecklistItem {
  readonly text: string
  readonly done: boolean
}

export interface TrailEntry {
  readonly actor: string
  readonly role: string
  readonly action: string
  readonly time: string
  readonly kind: TrailKind
  readonly comment?: string
}

export interface Submission {
  readonly code: string
  readonly title: string
  readonly requester: string
  readonly requesterId: string
  readonly cluster: Cluster
  readonly category: Category
  readonly createdAt: string
  /** Which desk the document is sitting at. */
  readonly stageKey: StageKey
  /** Days at the current desk, derived from stageEnteredAt by the caller. */
  readonly daysInStage: number
  readonly status: SubmissionStatus
  readonly attachments: readonly Attachment[]
  readonly checklist: readonly ChecklistItem[]
  readonly history: readonly TrailEntry[]
}

export interface Role {
  readonly id: string
  readonly name: string
  readonly type: RoleType
  /** Job title shown on the user card and the account picker. */
  readonly position: string
  /** Initials for the avatar. */
  readonly initials: string
  /** Secretaries only — the category they are responsible for. */
  readonly category?: Category
  /** Cluster monitors only — the cluster they watch. */
  readonly cluster?: Cluster
}

/** Category → id of the secretary who receives it. */
export type CategoryRoute = Readonly<Record<Category, string>>

export interface Staff {
  readonly name: string
  /** Desk this person works at — drives scope filtering. */
  readonly type: Exclude<RoleType, 'admin' | 'monitor'>
  /** Job title as shown on screen. */
  readonly position: string
  readonly scope: StaffScope
  /** Average days holding a document, last 30 days. */
  readonly avgDays: number
  readonly completed30: number
}

export interface ClusterStat {
  readonly avgDays: number
  readonly completed30: number
  readonly headcount: number
}

/** [date, documents in, documents completed] */
export type DailyPoint = readonly [string, number, number]
