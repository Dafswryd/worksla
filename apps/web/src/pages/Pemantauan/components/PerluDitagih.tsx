import { useAtomValue } from 'jotai'
import { selisihSla, tahapDari } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { pemegang } from '@/helpers/pemantauan'
import { alurAtom } from '@/stores/alurAtom'
import type { Pengajuan } from '@/types'

interface PerluDitagihProps {
  readonly daftar: readonly Pengajuan[]
  readonly onBuka: (kode: string) => void
}

/** Berkas yang lewat batas, diurutkan dari yang paling lama menunggu. */
export function PerluDitagih({ daftar, onBuka }: PerluDitagihProps) {
  const { tahapan, rute } = useAtomValue(alurAtom)
  const urut = [...daftar].sort((a, b) => selisihSla(b, tahapan) - selisihSla(a, tahapan))

  if (urut.length === 0) return <p className="p-empty">Tidak ada berkas yang lewat batas waktu.</p>

  return (
    <div style={{ padding: '6px 0 8px' }}>
      {urut.map((pengajuan) => {
        const siapa = pemegang(pengajuan, tahapan, rute)
        return (
          <button
            type="button"
            key={pengajuan.kode}
            className="ptable-row"
            style={{ gridTemplateColumns: 'minmax(0,1fr) 96px', padding: '10px 18px' }}
            onClick={() => onBuka(pengajuan.kode)}
          >
            <span className="p-main">
              <span className="p-dot lewat" />
              <span className="p-text">
                <span className="p-title">{pengajuan.judul}</span>
                <span className="p-kode num">
                  {siapa.nama} · {tahapDari(tahapan, pengajuan.tahap).meja}
                </span>
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <Chip tone="amber" angka>
                +{selisihSla(pengajuan, tahapan)} hari
              </Chip>
            </span>
          </button>
        )
      })}
    </div>
  )
}
