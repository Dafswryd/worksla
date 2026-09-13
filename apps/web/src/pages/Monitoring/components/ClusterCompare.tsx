import { useAtomValue } from 'jotai'
import { lewatSla } from '@imeri/shared'
import { Icon } from '@/components/Icon'
import { SEMUA_CLUSTER, STAT_CLUSTER } from '@/constants/pegawai'
import { alurAtom } from '@/stores/alurAtom'
import type { Pengajuan } from '@/types'

const KOLOM = 'minmax(0,1fr) 92px 92px 104px 108px'

/** Hanya untuk Super Admin — membandingkan empat cluster berdampingan. */
export function AntarCluster({ daftar }: { readonly daftar: readonly Pengajuan[] }) {
  const { tahapan } = useAtomValue(alurAtom)

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Perbandingan antar cluster</span>
      </div>

      <div className="wtable-head" style={{ gridTemplateColumns: KOLOM }}>
        <span>Cluster</span>
        <span>Aktif</span>
        <span>Lewat SLA</span>
        <span>Dikembalikan</span>
        <span>Rata-rata selesai</span>
      </div>

      {SEMUA_CLUSTER.map((cluster) => {
        const milik = daftar.filter((item) => item.cluster === cluster)
        const aktif = milik.filter((item) => item.status !== 'selesai')
        const telat = aktif.filter((item) => lewatSla(item, tahapan)).length
        const balik = milik.filter((item) => item.status === 'dikembalikan').length

        return (
          <div className="wtable-row" style={{ gridTemplateColumns: KOLOM }} key={cluster}>
            <span className="w-who">
              <span className="w-name">{cluster}</span>
            </span>
            <span className="w-num num">{aktif.length}</span>
            <span className={telat > 0 ? 'w-num num bad' : 'w-num num zero'}>{telat}</span>
            <span className={balik > 0 ? 'w-num num' : 'w-num num zero'}>{balik}</span>
            <span className="w-cell num" style={{ textAlign: 'center' }}>
              {STAT_CLUSTER[cluster].rata.toFixed(1)} hari
            </span>
          </div>
        )
      })}

      <div className="card-foot">
        <Icon name="alert" size={13} strokeWidth={2} />
        Rata-rata selesai dihitung dari berkas yang tuntas dalam 30 hari terakhir.
      </div>
    </div>
  )
}
