import { HARIAN } from '@/constants/pegawai'

/**
 * Berkas masuk vs selesai per hari, 14 hari terakhir. Kalau batang biru
 * terus lebih tinggi dari hijau, antrean sedang tumbuh.
 */
export function Pergerakan() {
  const puncak = Math.max(1, ...HARIAN.map(([, masuk, keluar]) => Math.max(masuk, keluar)))

  return (
    <>
      <div className="spark">
        {HARIAN.map(([tanggal, masuk, keluar]) => (
          <span className="spark-col" key={tanggal}>
            <span className="spark-bars">
              <i style={{ height: `${(masuk / puncak) * 100}%` }} title={`${tanggal}: ${masuk} masuk`} />
              <i className="out" style={{ height: `${(keluar / puncak) * 100}%` }} title={`${tanggal}: ${keluar} selesai`} />
            </span>
            <span className="spark-x">{tanggal}</span>
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
