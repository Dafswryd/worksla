import type { JSX } from 'react'

export type {
  Category,
  Cluster,
  StageKey,
  SubmissionStatus,
  RoleType,
  TrailKind,
  StaffScope,
  Stage,
  Attachment,
  ChecklistItem,
  TrailEntry,
  Submission,
  Role,
  CategoryRoute,
  Staff,
  ClusterStat,
  DailyPoint,
} from '@imeri/shared'

export type IconName =
  | 'inbox'
  | 'file'
  | 'stamp'
  | 'archive'
  | 'chart'
  | 'gear'
  | 'search'
  | 'plus'
  | 'close'
  | 'clip'
  | 'clock'
  | 'arrowRight'
  | 'rotateBack'
  | 'alert'
  | 'check'
  | 'people'
  | 'filter'
  | 'mail'
  | 'lock'
  | 'logout'
  | 'chevronDown'
  | 'shield'

export interface IconProps {
  readonly name: IconName
  readonly size?: number
  readonly strokeWidth?: number
}

export type GlyphMap = Record<IconName, JSX.Element>
