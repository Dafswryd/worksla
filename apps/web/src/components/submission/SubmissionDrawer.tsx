import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { canAdvance, checklistCleared, isHolder, isOverdue, stageByKey, stageIndexOf } from '@imeri/shared'
import { Chip, StatusChip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { CATEGORY_LABEL, CLUSTER_LABEL } from '@/constants/labels'
import { roleById } from '@/constants/roles'
import { ADVANCE_LABEL, RETURN_LABEL, STAGE_LABEL } from '@/constants/stages'
import { holderOf } from '@/helpers/monitoring'
import { flowAtom } from '@/stores/flowAtom'
import { useFlowActions } from '@/stores/submissionAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { useToast } from '@/stores/toastAtom'
import { RejectModal } from './RejectModal'
import type { Stage, Submission } from '@/types'

interface SubmissionDrawerProps {
  readonly submission: Submission
  readonly onClose: () => void
}

/** Timeline of where the document stands — one row per stage. */
function StageTimeline({
  submission,
  stages,
}: {
  readonly submission: Submission
  readonly stages: readonly Stage[]
}) {
  const overdue = isOverdue(submission, stages)
  const currentIndex = stageIndexOf(submission.stageKey)

  return (
    <ul className="vtl">
      {stages.map((stage, index) => {
        const stageIndex = stageIndexOf(stage.key)
        const passed = submission.status === 'done' || stageIndex < currentIndex
        const current = stageIndex === currentIndex && submission.status !== 'done'
        const className = passed
          ? 'done'
          : current
            ? submission.status === 'returned'
              ? 'back'
              : overdue
                ? 'late'
                : 'now'
            : ''

        const note = passed
          ? 'selesai'
          : current
            ? submission.status === 'returned'
              ? 'dikembalikan ke sini — menunggu perbaikan'
              : stage.sla === null
                ? 'menunggu pengaju'
                : `hari ke-${submission.daysInStage} dari batas ${stage.sla} hari${overdue ? ' — lewat batas' : ''}`
            : 'belum mulai'

        return (
          <li className={className} key={`${stage.key}-${index}`}>
            <span className="vtl-dot">
              {passed ? (
                <Icon name="check" size={12} strokeWidth={2.4} />
              ) : current ? (
                <Icon
                  name={submission.status === 'returned' ? 'rotateBack' : 'clock'}
                  size={12}
                  strokeWidth={2.2}
                />
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
              )}
            </span>
            <span className="vtl-body">
              <span className="vtl-who">{STAGE_LABEL[stage.key].desk}</span>
              <span className="vtl-what">{STAGE_LABEL[stage.key].action}</span>
              <span className="vtl-when">{note}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function SubmissionDrawer({ submission, onClose }: SubmissionDrawerProps) {
  const { stages, route } = useAtomValue(flowAtom)
  const role = useAtomValue(activeRoleAtom)
  const { advance, sendBack, toggleChecklist } = useFlowActions()
  const toast = useToast()
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !rejectOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, rejectOpen])

  const holding = isHolder(submission, role, stages)
  const holder = holderOf(submission, stages, route)
  const stage = stageByKey(stages, submission.stageKey)
  const advanceLabel = ADVANCE_LABEL[stage.key]
  const returnLabel = RETURN_LABEL[stage.key]
  const locked = !canAdvance(submission)

  return (
    <>
      <div className="task-backdrop" role="presentation" onClick={onClose} />
      <aside className="task-drawer" role="dialog" aria-label={`Detail ${submission.code}`}>
        <div className="task-drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="p-code num" style={{ marginBottom: 4 }}>
              {submission.code}
            </div>
            <div className="task-drawer-title">{submission.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              <StatusChip submission={submission} stages={stages} />
              <Chip tone="purple">{CATEGORY_LABEL[submission.category]}</Chip>
              <Chip>Cluster {CLUSTER_LABEL[submission.cluster]}</Chip>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="task-drawer-body">
          <p className="task-drawer-label">Bola ada di</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface-2)',
            }}
          >
            <span className="avatar" style={{ width: 30, height: 30, fontSize: 'var(--fs-xs)' }}>
              {holder.initials}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{holder.name}</div>
              <div className="user-plan">{holder.position}</div>
            </div>
            {holding ? (
              <span style={{ marginLeft: 'auto' }}>
                <Chip tone="blue">Anda</Chip>
              </span>
            ) : null}
          </div>

          <p className="task-drawer-label">Ringkasan</p>
          <dl className="kv">
            <dt>Pemohon</dt>
            <dd>{submission.requester}</dd>
            <dt>Dibuat</dt>
            <dd className="num">{submission.createdAt}</dd>
            <dt>Kategori</dt>
            <dd>{CATEGORY_LABEL[submission.category]}</dd>
            <dt>Sekret tujuan</dt>
            <dd>{roleById(route[submission.category]).name}</dd>
          </dl>

          <p className="task-drawer-label">Posisi berkas</p>
          <StageTimeline submission={submission} stages={stages} />

          <p className="task-drawer-label">Lampiran ({submission.attachments.length})</p>
          <div className="att">
            {submission.attachments.map((file) => (
              <div className="att-row" key={file.name}>
                <span className={`att-ico ${file.type}`}>
                  <Icon name="file" size={15} />
                </span>
                <span className="att-meta">
                  <span className="att-name">{file.name}</span>
                  <span className="att-sub num">{file.size} · v1</span>
                </span>
                <button
                  type="button"
                  className="row-btn"
                  onClick={() => toast('Pratinjau lampiran belum tersedia di prototipe ini', 'info')}
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>

          {submission.checklist.length > 0 ? (
            <>
              <p className="task-drawer-label">Checklist revisi</p>
              <ul className="ck">
                {submission.checklist.map((point, index) => (
                  <li className={point.done ? 'done' : undefined} key={point.text}>
                    <button
                      type="button"
                      disabled={!holding}
                      style={holding ? undefined : { cursor: 'default' }}
                      onClick={() => toggleChecklist(submission.code, index)}
                    >
                      <span className="ck-box">
                        <Icon name="check" size={11} strokeWidth={3} />
                      </span>
                      <span>{point.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="ck-gate">
                <Icon name="alert" size={13} strokeWidth={2} />
                {checklistCleared(submission)
                  ? 'Semua poin tertutup — berkas boleh diajukan ulang.'
                  : `${submission.checklist.filter((point) => !point.done).length} poin belum tertutup. Berkas belum bisa diteruskan.`}
              </p>
            </>
          ) : null}

          <p className="task-drawer-label">Riwayat</p>
          <div className="hist">
            {[...submission.history].reverse().map((entry, index) => (
              <div className="hist-row" key={`${entry.time}-${index}`}>
                <span className={`hist-ico ${entry.kind}`}>
                  <Icon
                    name={entry.kind === 'return' ? 'rotateBack' : entry.kind === 'submit' ? 'clip' : 'check'}
                    size={14}
                    strokeWidth={2}
                  />
                </span>
                <span className="hist-body">
                  <span className="hist-text">
                    <b>{entry.actor}</b> ({entry.role}) {entry.action}
                  </span>
                  <span className="hist-time num">{entry.time}</span>
                  {entry.comment ? <p className="hist-quote">{entry.comment}</p> : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        {submission.status === 'done' ? (
          <div className="drawer-note">
            <Icon name="check" size={15} strokeWidth={2} />
            Sudah disetujui dan diarsipkan. Berkas final bisa diunduh dari daftar lampiran.
          </div>
        ) : !holding ? (
          <div className="drawer-note">
            <Icon name="clock" size={15} strokeWidth={2} />
            Berkas ada di {holder.name}. Anda bisa memantau, belum bisa mengambil tindakan.
          </div>
        ) : (
          <div className="drawer-foot">
            {returnLabel ? (
              <button type="button" className="btn btn-danger" onClick={() => setRejectOpen(true)}>
                <Icon name="rotateBack" size={16} strokeWidth={2} /> {returnLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              disabled={locked}
              title={locked ? 'Tutup dulu semua poin checklist' : undefined}
              onClick={() => advance(submission.code)}
            >
              <Icon name="arrowRight" size={16} strokeWidth={2} /> {advanceLabel ?? 'Teruskan'}
            </button>
          </div>
        )}
      </aside>

      {rejectOpen ? (
        <RejectModal
          submission={submission}
          onCancel={() => setRejectOpen(false)}
          onSubmit={(comment) => {
            sendBack(submission.code, comment)
            setRejectOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
