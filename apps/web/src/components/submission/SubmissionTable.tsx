import { useAtomValue } from 'jotai'
import { isOverdue, stageByKey } from '@imeri/shared'
import { Chip, StatusChip } from '@/components/Chip'
import { CATEGORY_LABEL, CLUSTER_LABEL } from '@/constants/labels'
import { STAGE_LABEL } from '@/constants/stages'
import { holderOf } from '@/helpers/monitoring'
import { flowAtom } from '@/stores/flowAtom'
import type { Stage, Submission } from '@/types'

interface SubmissionTableProps {
  readonly list: readonly Submission[]
  readonly activeCode: string | null
  readonly onOpen: (code: string) => void
  readonly emptyText?: string
}

/** SLA marker for one document: day n of the limit, coloured by time left. */
function SlaCell({ submission, stages }: { readonly submission: Submission; readonly stages: readonly Stage[] }) {
  if (submission.status === 'done') return <span className="p-cell">—</span>

  const { sla } = stageByKey(stages, submission.stageKey)
  if (sla === null) return <span className="p-cell num">di pengaju</span>

  const tone = submission.daysInStage > sla ? 'amber' : submission.daysInStage === sla ? 'slate' : 'green'
  return (
    <Chip tone={tone} numeric>
      hari {submission.daysInStage}/{sla}
    </Chip>
  )
}

export function SubmissionTable({ list, activeCode, onOpen, emptyText }: SubmissionTableProps) {
  const { stages } = useAtomValue(flowAtom)

  return (
    <>
      <div className="ptable-head" style={{ marginTop: 12 }}>
        <span>Pengajuan</span>
        <span>Kategori / cluster</span>
        <span>Bola ada di</span>
        <span>SLA tahap</span>
        <span>Status</span>
      </div>

      {list.length === 0 ? (
        <p className="p-empty">{emptyText ?? 'Tidak ada berkas di tampilan ini.'}</p>
      ) : (
        list.map((submission) => {
          const holder = holderOf(submission, stages)
          const dot =
            submission.status === 'done'
              ? 'done'
              : submission.status === 'returned'
                ? 'returned'
                : isOverdue(submission, stages)
                  ? 'overdue'
                  : 'running'

          return (
            <button
              type="button"
              key={submission.code}
              className={activeCode === submission.code ? 'ptable-row is-open' : 'ptable-row'}
              onClick={() => onOpen(submission.code)}
            >
              <span className="p-main">
                <span className={`p-dot ${dot}`} />
                <span className="p-text">
                  <span className="p-title">{submission.title}</span>
                  <span className="p-code num">
                    {submission.code} · {submission.requester} · {submission.attachments.length} lampiran
                  </span>
                </span>
              </span>

              <span className="p-cell col-kat">
                {CATEGORY_LABEL[submission.category]}
                <small>Cluster {CLUSTER_LABEL[submission.cluster]}</small>
              </span>

              <span className="p-pos">
                <span className="p-pos-av">{holder.initials}</span>
                <span className="p-cell">
                  {holder.name}
                  <small>{STAGE_LABEL[submission.stageKey].action}</small>
                </span>
              </span>

              <span>
                <SlaCell submission={submission} stages={stages} />
              </span>

              <span className="col-status">
                <StatusChip submission={submission} stages={stages} />
              </span>
            </button>
          )
        })
      )}
    </>
  )
}
