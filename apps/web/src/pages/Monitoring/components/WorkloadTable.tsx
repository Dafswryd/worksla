import { Icon } from '@/components/Icon'
import { inisial } from '@/helpers/format'
import type { BarisBeban } from '@/helpers/pemantauan'

interface TabelBebanProps {
  readonly baris: readonly BarisBeban[]
  /** Versi penuh menampilkan kolom peran dan rata-rata; versi ringkas tidak. */
  readonly penuh: boolean
}

export function TabelBeban({ baris, penuh }: TabelBebanProps) {
  const slim = penuh ? '' : ' wt-slim'
  const tampil = penuh ? baris : [...baris].sort((a, b) => b.jumlah - a.jumlah).slice(0, 6)
  const puncak = Math.max(1, ...baris.map((item) => item.jumlah))

  return (
    <>
      <div className={`wtable-head${slim}`} style={{ marginTop: penuh ? 0 : 12 }}>
        <span>Pegawai</span>
        {penuh ? <span>Peran</span> : null}
        <span>Di meja</span>
        <span>Lewat SLA</span>
        <span>Beban</span>
        {penuh ? <span>Rata-rata</span> : null}
      </div>

      {tampil.map(({ pegawai, jumlah, telat }) => (
        <div className={`wtable-row${slim}`} key={pegawai.nama}>
          <span className="w-who">
            <span className="p-pos-av">{inisial(pegawai.nama)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="w-name">{pegawai.nama}</span>
              <small style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--ink-400)' }}>
                {pegawai.selesai30} selesai / 30 hari
              </small>
            </span>
          </span>

          <span className="w-cell w-peran">
            {pegawai.peran}
            <small>{pegawai.cluster}</small>
          </span>

          <span className={jumlah > 0 ? 'w-num num' : 'w-num num zero'}>{jumlah}</span>
          <span className={telat > 0 ? 'w-num num bad' : 'w-num num zero'}>{telat}</span>

          <span className="w-load">
            <span className="stat-bar">
              <i className={telat > 0 ? 'hot' : undefined} style={{ width: `${(jumlah / puncak) * 100}%` }} />
            </span>
          </span>

          <span className="w-cell w-rata num" style={{ textAlign: 'center' }}>
            {pegawai.rata.toFixed(1)} hr
          </span>
        </div>
      ))}

      {penuh ? (
        <div className="card-foot">
          <Icon name="alert" size={13} strokeWidth={2} />
          “Di meja” dihitung langsung dari berkas yang saat ini ada di tangan orang tersebut. “Rata-rata” adalah lama
          memegang berkas selama 30 hari terakhir.
        </div>
      ) : null}
    </>
  )
}
