import { Icon } from '@/components/Icon'
import { scopeLabel } from '@/constants/labels'
import { initialsOf } from '@/helpers/format'
import type { WorkloadRow } from '@/helpers/monitoring'

interface WorkloadTableProps {
  readonly rows: readonly WorkloadRow[]
  /** The full variant shows the position and average columns; the compact one does not. */
  readonly full: boolean
}

export function WorkloadTable({ rows, full }: WorkloadTableProps) {
  const slim = full ? '' : ' wt-slim'
  const shown = full ? rows : [...rows].sort((a, b) => b.count - a.count).slice(0, 6)
  const peak = Math.max(1, ...rows.map((item) => item.count))

  return (
    <>
      <div className={`wtable-head${slim}`} style={{ marginTop: full ? 0 : 12 }}>
        <span>Pegawai</span>
        {full ? <span>Peran</span> : null}
        <span>Di meja</span>
        <span>Lewat SLA</span>
        <span>Beban</span>
        {full ? <span>Rata-rata</span> : null}
      </div>

      {shown.map(({ staff, count, overdue }) => (
        <div className={`wtable-row${slim}`} key={staff.name}>
          <span className="w-who">
            <span className="p-pos-av">{initialsOf(staff.name)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="w-name">{staff.name}</span>
              <small style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--ink-400)' }}>
                {staff.completed30} selesai / 30 hari
              </small>
            </span>
          </span>

          <span className="w-cell w-role">
            {staff.position}
            <small>{scopeLabel(staff.scope)}</small>
          </span>

          <span className={count > 0 ? 'w-num num' : 'w-num num zero'}>{count}</span>
          <span className={overdue > 0 ? 'w-num num bad' : 'w-num num zero'}>{overdue}</span>

          <span className="w-load">
            <span className="stat-bar">
              <i className={overdue > 0 ? 'hot' : undefined} style={{ width: `${(count / peak) * 100}%` }} />
            </span>
          </span>

          <span className="w-cell w-avg num" style={{ textAlign: 'center' }}>
            {staff.avgDays.toFixed(1)} hr
          </span>
        </div>
      ))}

      {full ? (
        <div className="card-foot">
          <Icon name="alert" size={13} strokeWidth={2} />
          “Di meja” dihitung langsung dari berkas yang saat ini ada di tangan orang tersebut. “Rata-rata” adalah lama
          memegang berkas selama 30 hari terakhir.
        </div>
      ) : null}
    </>
  )
}
