import { DAILY } from '@/constants/staff'

/**
 * Documents in vs completed per day over the last 14 days. If the blue bars stay
 * taller than the green ones, the queue is growing.
 */
export function Throughput() {
  const peak = Math.max(1, ...DAILY.map(([, incoming, completed]) => Math.max(incoming, completed)))

  return (
    <>
      <div className="spark">
        {DAILY.map(([date, incoming, completed]) => (
          <span className="spark-col" key={date}>
            <span className="spark-bars">
              <i style={{ height: `${(incoming / peak) * 100}%` }} title={`${date}: ${incoming} masuk`} />
              <i
                className="out"
                style={{ height: `${(completed / peak) * 100}%` }}
                title={`${date}: ${completed} selesai`}
              />
            </span>
            <span className="spark-x">{date}</span>
          </span>
        ))}
      </div>

      <div className="spark-legend">
        <span>
          <i className="dot" style={{ background: 'var(--blue-600)' }} /> Berkas masuk
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--green-500)' }} /> Berkas selesai
        </span>
      </div>
    </>
  )
}
