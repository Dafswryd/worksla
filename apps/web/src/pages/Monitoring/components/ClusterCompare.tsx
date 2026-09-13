import { useAtomValue } from 'jotai'
import { isOverdue } from '@imeri/shared'
import { Icon } from '@/components/Icon'
import { CLUSTER_LABEL } from '@/constants/labels'
import { ALL_CLUSTERS, CLUSTER_STATS } from '@/constants/staff'
import { flowAtom } from '@/stores/flowAtom'
import type { Submission } from '@/types'

const COLUMNS = 'minmax(0,1fr) 92px 92px 104px 108px'

/** Super admin only — the four clusters side by side. */
export function ClusterCompare({ list }: { readonly list: readonly Submission[] }) {
  const { stages } = useAtomValue(flowAtom)

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Perbandingan antar cluster</span>
      </div>

      <div className="wtable-head" style={{ gridTemplateColumns: COLUMNS }}>
        <span>Cluster</span>
        <span>Aktif</span>
        <span>Lewat SLA</span>
        <span>Dikembalikan</span>
        <span>Rata-rata selesai</span>
      </div>

      {ALL_CLUSTERS.map((cluster) => {
        const owned = list.filter((item) => item.cluster === cluster)
        const active = owned.filter((item) => item.status !== 'done')
        const overdue = active.filter((item) => isOverdue(item, stages)).length
        const returned = owned.filter((item) => item.status === 'returned').length

        return (
          <div className="wtable-row" style={{ gridTemplateColumns: COLUMNS }} key={cluster}>
            <span className="w-who">
              <span className="w-name">{CLUSTER_LABEL[cluster]}</span>
            </span>
            <span className="w-num num">{active.length}</span>
            <span className={overdue > 0 ? 'w-num num bad' : 'w-num num zero'}>{overdue}</span>
            <span className={returned > 0 ? 'w-num num' : 'w-num num zero'}>{returned}</span>
            <span className="w-cell num" style={{ textAlign: 'center' }}>
              {CLUSTER_STATS[cluster].avgDays.toFixed(1)} hari
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
