import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { tahapDari } from '@imeri/shared'
import { Icon } from '@/components/Icon'
import { peranDari } from '@/constants/peran'
import { alurAtom } from '@/stores/alurAtom'
import type { Pengajuan } from '@/types'

interface TolakModalProps {
  readonly pengajuan: Pengajuan
  readonly onBatal: () => void
  readonly onKirim: (komentar: string) => void
}

const CONTOH = ['Surat persetujuan atasan langsung belum dilampirkan', 'Tanggal di form berbeda dengan yang tertulis di surat'].join('\n')

/** Nama orang yang akan menerima berkas setelah dikembalikan satu langkah. */
function penerima(pengajuan: Pengajuan, tujuanKey: string, ruteSekret: string): string {
  if (tujuanKey === 'pengaju') return pengajuan.pemohon
  if (tujuanKey === 'sekret' || tujuanKey === 'rekam') return peranDari(ruteSekret).nama
  if (tujuanKey === 'wadir') return peranDari('hendra').nama
  return peranDari('ratna').nama
}

export function TolakModal({ pengajuan, onBatal, onKirim }: TolakModalProps) {
  const { tahapan, rute } = useAtomValue(alurAtom)
  const [komentar, setKomentar] = useState(CONTOH)
  const tujuan = tahapDari(tahapan, pengajuan.tahap - 1)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Kembalikan pengajuan">
      <div className="modal-card danger">
        <div className="modal-head">
          <span className="modal-ico danger">
            <Icon name="rotateBack" size={16} strokeWidth={2} />
          </span>
          <span className="modal-title">Kembalikan ke {tujuan.meja}</span>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onBatal}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="komentar">Alasan pengembalian</label>
            <textarea
              id="komentar"
              value={komentar}
              placeholder="Tulis satu alasan per baris…"
              onChange={(event) => setKomentar(event.target.value)}
            />
            <p className="hint">
              Setiap baris menjadi satu poin checklist yang harus ditutup sebelum berkas boleh diteruskan lagi.
            </p>
          </div>

          <div className="route-note">
            <Icon name="arrowRight" size={15} strokeWidth={2} />
            Berkas mundur satu langkah ke {penerima(pengajuan, tujuan.key, rute[pengajuan.kategori])} — bukan kembali ke
            awal.
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBatal}>
            Batal
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onKirim(komentar)}>
            Kembalikan berkas
          </button>
        </div>
      </div>
    </div>
  )
}
