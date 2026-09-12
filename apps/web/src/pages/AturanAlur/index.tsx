import { Navigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { PERAN, SEMUA_KATEGORI, peranDari } from '@/constants/peran'
import { alurAtom, ubahRute, ubahSla } from '@/stores/alurAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { useToast } from '@/stores/toastAtom'
import type { Kategori } from '@/types'

/**
 * Satu-satunya layar yang mengubah aturan, dan hanya Super Admin yang
 * membukanya. Mengubah satu angka di sini langsung mengubah penanda SLA di
 * seluruh daftar berkas dan angka di papan pemantauan.
 */
export default function AturanAlur() {
  const peran = useAtomValue(peranAktifAtom)
  const [alur, setAlur] = useAtom(alurAtom)
  const toast = useToast()

  if (peran.tipe !== 'admin') return <Navigate to="/" replace />

  const sekretTersedia = Object.values(PERAN).filter((kandidat) => kandidat.tipe === 'sekret')

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Aturan alur</h1>
          <p className="page-sub">Batas waktu tiap tahap dan rute kategori ke sekret yang menanganinya.</p>
        </div>
      </div>

      <div className="mgrid">
        <div className="m8">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Batas waktu per tahap</span>
              <Chip tone="blue">berlaku langsung</Chip>
            </div>
            <p className="card-desc">
              Angka ini yang menentukan kapan sebuah berkas dihitung terlambat. Ubah salah satu dan seluruh papan
              pemantauan serta penanda SLA di daftar berkas ikut berubah.
            </p>

            <div style={{ marginTop: 14 }}>
              {alur.tahapan.map((tahap, indeks) =>
                tahap.sla === null ? null : (
                  <div className="rule-row" key={`${tahap.key}-${indeks}`}>
                    <span className="rule-name">
                      {tahap.meja} — {tahap.aksi}
                      <small>Tahap {indeks} dari {alur.tahapan.length - 1}</small>
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={tahap.sla}
                      aria-label={`Batas hari ${tahap.aksi}`}
                      onChange={(event) => {
                        const hari = Number(event.target.value)
                        if (Number.isNaN(hari)) return
                        setAlur((prev) => ubahSla(prev, indeks, hari))
                      }}
                      onBlur={() => toast(`Batas ${tahap.meja} — ${tahap.aksi} disimpan`)}
                    />
                  </div>
                ),
              )}
            </div>

            <div className="card-foot">
              <Icon name="clock" size={13} strokeWidth={2} />
              Hitungan berjalan sejak berkas masuk ke satu meja dan berhenti saat berkas keluar.
            </div>
          </div>
        </div>

        <div className="m4">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Rute kategori</span>
            </div>
            <p className="card-desc">Kategori pengajuan menentukan sekret mana yang menerimanya.</p>

            <div style={{ marginTop: 14 }}>
              {SEMUA_KATEGORI.map((kategori: Kategori) => (
                <div className="rule-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 132px' }} key={kategori}>
                  <span className="rule-name">{kategori}</span>
                  <select
                    className="task-select"
                    aria-label={`Sekret untuk ${kategori}`}
                    value={alur.rute[kategori]}
                    onChange={(event) => {
                      const sekretId = event.target.value
                      setAlur((prev) => ubahRute(prev, kategori, sekretId))
                      toast(`Kategori ${kategori} sekarang dirutekan ke ${peranDari(sekretId).nama}`)
                    }}
                  >
                    {sekretTersedia.map((sekret) => (
                      <option value={sekret.id} key={sekret.id}>
                        {sekret.nama}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="card-foot">
              <Icon name="alert" size={13} strokeWidth={2} />
              Mengubah rute hanya berlaku untuk pengajuan baru.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
