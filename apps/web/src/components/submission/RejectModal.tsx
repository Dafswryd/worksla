import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { stageAt } from '@imeri/shared'
import { Icon } from '@/components/Icon'
import { roleById } from '@/constants/roles'
import { flowAtom } from '@/stores/flowAtom'
import type { StageKey, Submission } from '@/types'

interface RejectModalProps {
  readonly submission: Submission
  readonly onCancel: () => void
  readonly onSubmit: (comment: string) => void
}

const SAMPLE = [
  'Surat persetujuan atasan langsung belum dilampirkan',
  'Tanggal di form berbeda dengan yang tertulis di surat',
].join('\n')

/** Name of the person who receives the document after it is sent back one step. */
function recipient(submission: Submission, targetKey: StageKey, secretaryId: string): string {
  if (targetKey === 'submitter') return submission.requester
  if (targetKey === 'secretary' || targetKey === 'recording') return roleById(secretaryId).name
  if (targetKey === 'deputy') return roleById('hendra').name
  return roleById('ratna').name
}

export function RejectModal({ submission, onCancel, onSubmit }: RejectModalProps) {
  const { stages, route } = useAtomValue(flowAtom)
  const [comment, setComment] = useState(SAMPLE)
  const target = stageAt(stages, submission.stageIndex - 1)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Kembalikan pengajuan">
      <div className="modal-card danger">
        <div className="modal-head">
          <span className="modal-ico danger">
            <Icon name="rotateBack" size={16} strokeWidth={2} />
          </span>
          <span className="modal-title">Kembalikan ke {target.desk}</span>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onCancel}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="comment">Alasan pengembalian</label>
            <textarea
              id="comment"
              value={comment}
              placeholder="Tulis satu alasan per baris…"
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="hint">
              Setiap baris menjadi satu poin checklist yang harus ditutup sebelum berkas boleh diteruskan lagi.
            </p>
          </div>

          <div className="route-note">
            <Icon name="arrowRight" size={15} strokeWidth={2} />
            Berkas mundur satu langkah ke {recipient(submission, target.key, route[submission.category])} — bukan
            kembali ke awal.
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onSubmit(comment)}>
            Kembalikan berkas
          </button>
        </div>
      </div>
    </div>
  )
}
