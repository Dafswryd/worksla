import type { ReactNode } from 'react'
import { isOverdue } from '@imeri/shared'
import type { Stage, Submission } from '@/types'

export type ChipTone = 'neutral' | 'red' | 'amber' | 'green' | 'blue' | 'slate' | 'purple'

const CLASS: Record<ChipTone, string> = {
  neutral: 'chip',
  red: 'chip t-red',
  amber: 'chip t-amber',
  green: 'chip t-green',
  blue: 'chip t-blue',
  slate: 'chip t-slate',
  purple: 'chip t-purple',
}

interface ChipProps {
  readonly tone?: ChipTone
  readonly numeric?: boolean
  readonly children: ReactNode
}

export function Chip({ tone = 'neutral', numeric = false, children }: ChipProps) {
  return <span className={numeric ? `${CLASS[tone]} num` : CLASS[tone]}>{children}</span>
}

/** Document status chip — kept in one place so the colours stay consistent across tables. */
export function StatusChip({
  submission,
  stages,
}: {
  readonly submission: Submission
  readonly stages: readonly Stage[]
}) {
  if (submission.status === 'done') return <Chip tone="green">Selesai</Chip>
  if (submission.status === 'returned') return <Chip tone="red">Dikembalikan</Chip>
  if (isOverdue(submission, stages)) return <Chip tone="amber">Lewat SLA</Chip>
  return <Chip tone="blue">Berjalan</Chip>
}
