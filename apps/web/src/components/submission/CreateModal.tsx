import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Icon } from '@/components/Icon'
import { SEMUA_KATEGORI, peranDari } from '@/constants/peran'
import { alurAtom } from '@/stores/alurAtom'
import type { Kategori } from '@/types'

interface BuatModalProps {
  readonly onBatal: () => void
  readonly onKirim: (judul: string, kategori: Kategori) => void
}

const LAMPIRAN_CONTOH = [
  { nama: 'Foto kondisi ruang arsip.pdf', ukuran: '820 KB', tipe: 'pdf' as const },
  { nama: 'Estimasi harga rak.xlsx', ukuran: '44 KB', tipe: 'xls' as const },
]

export function BuatModal({ onBatal, onKirim }: BuatModalProps) {
  const { rute } = useAtomValue(alurAtom)
  const [judul, setJudul] = useState('Pengadaan rak arsip ruang dokumen riset')
  const [kategori, setKategori] = useState<Kategori>('Keuangan')
  const [uraian, setUraian] = useState(
    'Rak arsip di ruang dokumen riset sudah penuh sehingga berkas tahun berjalan menumpuk di meja.',
  )
  const sekret = peranDari(rute[kategori])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Buat pengajuan">
      <div className="modal-card">
        <div className="modal-head">
          <span className="modal-ico">
            <Icon name="plus" size={16} strokeWidth={2} />
          </span>
          <span className="modal-title">Buat pengajuan baru</span>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onBatal}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="nJudul">Judul pengajuan</label>
            <input id="nJudul" value={judul} onChange={(event) => setJudul(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="nKat">Kategori</label>
            <select id="nKat" value={kategori} onChange={(event) => setKategori(event.target.value as Kategori)}>
              {SEMUA_KATEGORI.map((pilihan) => (
                <option value={pilihan} key={pilihan}>
                  {pilihan}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="nUraian">Uraian singkat</label>
            <textarea
              id="nUraian"
              style={{ minHeight: 70 }}
              value={uraian}
              onChange={(event) => setUraian(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="nLampiran">Lampiran</label>
            <div className="att" id="nLampiran">
              {LAMPIRAN_CONTOH.map((berkas) => (
                <div className="att-row" key={berkas.nama}>
                  <span className={`att-ico ${berkas.tipe}`}>
                    <Icon name="file" size={15} />
                  </span>
                  <span className="att-meta">
                    <span className="att-name">{berkas.nama}</span>
                    <span className="att-sub num">{berkas.ukuran} · baru diunggah</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="hint">Minimal satu lampiran. Lampiran ikut berkas ke setiap meja.</p>
          </div>

          <div className="route-note">
            <Icon name="arrowRight" size={15} strokeWidth={2} />
            Akan masuk ke {sekret.nama} — {sekret.jab}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBatal}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onKirim(judul, kategori)}>
            Kirim pengajuan
          </button>
        </div>
      </div>
    </div>
  )
}
