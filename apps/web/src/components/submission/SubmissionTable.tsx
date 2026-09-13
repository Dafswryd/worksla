import { useAtomValue } from 'jotai'
import { lewatSla, tahapDari } from '@imeri/shared'
import { Chip, StatusChip } from '@/components/Chip'
import { pemegang } from '@/helpers/pemantauan'
import { alurAtom } from '@/stores/alurAtom'
import type { Pengajuan, Tahap } from '@/types'

interface PengajuanTableProps {
  readonly daftar: readonly Pengajuan[]
  readonly kodeAktif: string | null
  readonly onBuka: (kode: string) => void
  readonly kosong?: string
}

/** Penanda SLA satu berkas: hari ke-n dari batas, diwarnai menurut sisa waktu. */
function SlaSel({ pengajuan, tahapan }: { readonly pengajuan: Pengajuan; readonly tahapan: readonly Tahap[] }) {
  if (pengajuan.status === 'selesai') return <span className="p-cell">—</span>

  const { sla } = tahapDari(tahapan, pengajuan.tahap)
  if (sla === null) return <span className="p-cell num">di pengaju</span>

  const tone = pengajuan.hari > sla ? 'amber' : pengajuan.hari === sla ? 'slate' : 'green'
  return (
    <Chip tone={tone} angka>
      hari {pengajuan.hari}/{sla}
    </Chip>
  )
}

export function PengajuanTable({ daftar, kodeAktif, onBuka, kosong }: PengajuanTableProps) {
  const { tahapan, rute } = useAtomValue(alurAtom)

  return (
    <>
      <div className="ptable-head" style={{ marginTop: 12 }}>
        <span>Pengajuan</span>
        <span>Kategori / cluster</span>
        <span>Bola ada di</span>
        <span>SLA tahap</span>
        <span>Status</span>
      </div>

      {daftar.length === 0 ? (
        <p className="p-empty">{kosong ?? 'Tidak ada berkas di tampilan ini.'}</p>
      ) : (
        daftar.map((pengajuan) => {
          const pegang = pemegang(pengajuan, tahapan, rute)
          const titik =
            pengajuan.status === 'selesai'
              ? 'selesai'
              : pengajuan.status === 'dikembalikan'
                ? 'balik'
                : lewatSla(pengajuan, tahapan)
                  ? 'lewat'
                  : 'jalan'

          return (
            <button
              type="button"
              key={pengajuan.kode}
              className={kodeAktif === pengajuan.kode ? 'ptable-row is-open' : 'ptable-row'}
              onClick={() => onBuka(pengajuan.kode)}
            >
              <span className="p-main">
                <span className={`p-dot ${titik}`} />
                <span className="p-text">
                  <span className="p-title">{pengajuan.judul}</span>
                  <span className="p-kode num">
                    {pengajuan.kode} · {pengajuan.pemohon} · {pengajuan.lampiran.length} lampiran
                  </span>
                </span>
              </span>

              <span className="p-cell col-kat">
                {pengajuan.kategori}
                <small>Cluster {pengajuan.cluster}</small>
              </span>

              <span className="p-pos">
                <span className="p-pos-av">{pegang.ini}</span>
                <span className="p-cell">
                  {pegang.nama}
                  <small>{tahapDari(tahapan, pengajuan.tahap).aksi}</small>
                </span>
              </span>

              <span>
                <SlaSel pengajuan={pengajuan} tahapan={tahapan} />
              </span>

              <span className="col-status">
                <StatusChip pengajuan={pengajuan} tahapan={tahapan} />
              </span>
            </button>
          )
        })
      )}
    </>
  )
}
