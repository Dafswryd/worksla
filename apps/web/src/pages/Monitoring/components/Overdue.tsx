import { useAtomValue } from 'jotai'
import { overdueDays } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { STAGE_LABEL } from '@/constants/stages'
import { holderOf } from '@/helpers/monitoring'
import { flowAtom } from '@/stores/flowAtom'
import type { Submission } from '@/types'

interface OverdueProps {
  readonly list: readonly Submission[]
  readonly onOpen: (code: string) => void
}

/** Documents past their deadline, longest wait first. */
export function Overdue({ list, onOpen }: OverdueProps) {
  const { stages } = useAtomValue(flowAtom)
  const sorted = [...list].sort((a, b) => overdueDays(b, stages) - overdueDays(a, stages))

  if (sorted.length === 0) return <p className="p-empty">Tidak ada berkas yang lewat batas waktu.</p>

  return (
    <div style={{ padding: '6px 0 8px' }}>
      {sorted.map((submission) => {
        const holder = holderOf(submission, stages)
        return (
          <button
            type="button"
            key={submission.code}
            className="ptable-row"
            style={{ gridTemplateColumns: 'minmax(0,1fr) 96px', padding: '10px 18px' }}
            onClick={() => onOpen(submission.code)}
          >
            <span className="p-main">
              <span className="p-dot overdue" />
              <span className="p-text">
                <span className="p-title">{submission.title}</span>
                <span className="p-code num">
                  {holder.name} · {STAGE_LABEL[submission.stageKey].desk}
                </span>
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <Chip tone="amber" numeric>
                +{overdueDays(submission, stages)} hari
              </Chip>
            </span>
          </button>
        )
      })}
    </div>
  )
}
