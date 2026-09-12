import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { pemantau } from '@imeri/shared'
import { AkunSelect } from '@/components/AkunSelect'
import { Icon } from '@/components/Icon'
import { peranDari } from '@/constants/peran'
import { emailDari } from '@/helpers/format'
import { sesiAtom } from '@/stores/sesiAtom'

const JANJI = [
  {
    ikon: 'inbox' as const,
    judul: 'Bola tidak pernah hilang',
    isi: 'Setiap perpindahan meja tercatat dengan nama dan waktu.',
  },
  {
    ikon: 'clock' as const,
    judul: 'Batas waktu per tahap',
    isi: 'Hitungan berjalan sejak berkas masuk, berhenti saat keluar.',
  },
  {
    ikon: 'clip' as const,
    judul: 'Lampiran ikut sepanjang rute',
    isi: 'Tanpa hard copy berpindah meja, paraf dan tanda tangan digital.',
  },
]

/**
 * Halaman masuk. Kata sandi tidak diperiksa — begitu backend siap, submit
 * memanggil authApi.masuk() dan hasilnya mengisi sesiAtom.
 */
export default function Login() {
  const [sesi, setSesi] = useAtom(sesiAtom)
  const [peranId, setPeranId] = useState(sesi.peranId)
  const [sandi, setSandi] = useState('prototipe')
  const navigate = useNavigate()
  const peran = peranDari(peranId)

  const masuk = () => {
    setSesi({ masuk: true, peranId })
    navigate(pemantau(peran) ? '/pemantauan' : '/')
  }

  return (
    <div className="login">
      <section className="login-brand">
        <img className="login-wash" src="/logo/imeri-mark.png" alt="" aria-hidden="true" />
        <img
          className="login-logo"
          src="/logo/imeri-full.png"
          alt="IMERI — Indonesian Medical Education and Research Institute"
        />

        <div>
          <h1 className="login-h">Satu berkas, satu rute, satu papan status.</h1>
          <p className="login-p">
            Sistem pengajuan dokumen lintas cluster IMERI — dari peneliti yang menyusun berkas, lewat sekret sesuai
            kategorinya, ke Wadir untuk paraf, sampai tanda tangan Direktur.
          </p>
          <div className="login-points">
            {JANJI.map((janji) => (
              <div className="login-point" key={janji.judul}>
                <span className="lp-ico">
                  <Icon name={janji.ikon} size={16} strokeWidth={1.8} />
                </span>
                <span>
                  <b>{janji.judul}</b>
                  <span>{janji.isi}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="login-foot">
          IMERI · Fakultas Kedokteran Universitas Indonesia
          <br />
          Prototipe antarmuka — belum terhubung ke sistem mana pun.
        </p>
      </section>

      <section className="login-form">
        <form
          className="login-card"
          onSubmit={(event) => {
            event.preventDefault()
            masuk()
          }}
        >
          <span className="proto-tag">
            <Icon name="alert" size={12} strokeWidth={2} /> Prototipe · data contoh
          </span>
          <h2>Masuk ke akun Anda</h2>
          <p className="sub">Gunakan email institusi yang terdaftar di cluster Anda.</p>

          <div className="field">
            <label id="lb-akun">
              <Icon name="shield" size={11} strokeWidth={2} /> Masuk sebagai
            </label>
            <AkunSelect nilai={peranId} onPilih={setPeranId} labelId="lb-akun" />
          </div>

          <div className="field">
            <label htmlFor="lg-mail">
              <Icon name="mail" size={11} strokeWidth={2} /> Email institusi
            </label>
            <input id="lg-mail" type="email" readOnly value={emailDari(peran.nama)} autoComplete="username" />
          </div>

          <div className="field">
            <label htmlFor="lg-pass">
              <Icon name="lock" size={11} strokeWidth={2} /> Kata sandi
            </label>
            <input
              id="lg-pass"
              type="password"
              value={sandi}
              autoComplete="current-password"
              onChange={(event) => setSandi(event.target.value)}
            />
          </div>

          <div className="login-row">
            <label htmlFor="lg-ingat">
              <input id="lg-ingat" type="checkbox" defaultChecked /> Ingat saya di perangkat ini
            </label>
            <button type="button" className="login-link">
              Lupa kata sandi?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            <Icon name="arrowRight" size={16} strokeWidth={2} /> Masuk
          </button>
        </form>
      </section>
    </div>
  )
}
