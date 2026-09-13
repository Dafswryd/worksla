import { Icon } from '@/components/Icon'
import type { BacklogRow } from '@/helpers/monitoring'

/**
 * How many documents are piled up at each desk. Bar length is relative to the
 * busiest desk; the amber portion is the documents already past their deadline.
 */
export function Backlog({ rows }: { readonly rows: readonly BacklogRow[] }) {
  const peak = Math.max(1, ...rows.map((item) => item.count))

  return (
    <>
      <div className="bn-list">
        {rows.map((item) => (
          <div className="bn-row" key={item.stage.key}>
            <span className="bn-name">
              {item.desk}
              <small>{item.action}</small>
            </span>
            <span
              className="bn-bar"
              role="img"
              aria-label={`${item.count} berkas, ${item.overdue} lewat batas`}
            >
              <i className="ok" style={{ width: `${((item.count - item.overdue) / peak) * 100}%` }} />
              <i className="late" style={{ width: `${(item.overdue / peak) * 100}%` }} />
            </span>
            <span className="bn-val num">
              {item.count}
              <small>{item.stage.sla === null ? 'tanpa batas' : `batas ${item.stage.sla} hari`}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="card-foot">
        <Icon name="alert" size={13} strokeWidth={2} />
        Batang kuning = berkas yang sudah lewat batas waktu tahapnya.
      </div>
    </>
  )
}
