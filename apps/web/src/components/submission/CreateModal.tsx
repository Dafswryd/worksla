import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Icon } from '@/components/Icon'
import { CATEGORY_LABEL } from '@/constants/labels'
import { ALL_CATEGORIES, roleById } from '@/constants/roles'
import { flowAtom } from '@/stores/flowAtom'
import type { Category } from '@/types'

interface CreateModalProps {
  readonly onCancel: () => void
  readonly onSubmit: (title: string, category: Category) => void
}

const SAMPLE_ATTACHMENTS = [
  { name: 'Foto kondisi ruang arsip.pdf', size: '820 KB', type: 'pdf' as const },
  { name: 'Estimasi harga rak.xlsx', size: '44 KB', type: 'xls' as const },
]

export function CreateModal({ onCancel, onSubmit }: CreateModalProps) {
  const { route } = useAtomValue(flowAtom)
  const [title, setTitle] = useState('Pengadaan rak arsip ruang dokumen riset')
  const [category, setCategory] = useState<Category>('finance')
  const [summary, setSummary] = useState(
    'Rak arsip di ruang dokumen riset sudah penuh sehingga berkas tahun berjalan menumpuk di meja.',
  )
  const secretary = roleById(route[category])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Buat pengajuan">
      <div className="modal-card">
        <div className="modal-head">
          <span className="modal-ico">
            <Icon name="plus" size={16} strokeWidth={2} />
          </span>
          <span className="modal-title">Buat pengajuan baru</span>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onCancel}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="nTitle">Judul pengajuan</label>
            <input id="nTitle" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="nCategory">Kategori</label>
            <select
              id="nCategory"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
            >
              {ALL_CATEGORIES.map((option) => (
                <option value={option} key={option}>
                  {CATEGORY_LABEL[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="nSummary">Uraian singkat</label>
            <textarea
              id="nSummary"
              style={{ minHeight: 70 }}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="nAttachments">Lampiran</label>
            <div className="att" id="nAttachments">
              {SAMPLE_ATTACHMENTS.map((file) => (
                <div className="att-row" key={file.name}>
                  <span className={`att-ico ${file.type}`}>
                    <Icon name="file" size={15} />
                  </span>
                  <span className="att-meta">
                    <span className="att-name">{file.name}</span>
                    <span className="att-sub num">{file.size} · baru diunggah</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="hint">Minimal satu lampiran. Lampiran ikut berkas ke setiap meja.</p>
          </div>

          <div className="route-note">
            <Icon name="arrowRight" size={15} strokeWidth={2} />
            Akan masuk ke {secretary.name} — {secretary.position}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onSubmit(title, category)}>
            Kirim pengajuan
          </button>
        </div>
      </div>
    </div>
  )
}
