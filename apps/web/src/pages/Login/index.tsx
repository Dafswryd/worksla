import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { isObserver } from '@imeri/shared'
import { AccountSelect } from '@/components/AccountSelect'
import { Icon } from '@/components/Icon'
import { roleById } from '@/constants/roles'
import { emailFor } from '@/helpers/format'
import { sessionAtom } from '@/stores/sessionAtom'

const PROMISES = [
  {
    icon: 'inbox' as const,
    title: 'Bola tidak pernah hilang',
    body: 'Setiap perpindahan meja tercatat dengan nama dan waktu.',
  },
  {
    icon: 'clock' as const,
    title: 'Batas waktu per tahap',
    body: 'Hitungan berjalan sejak berkas masuk, berhenti saat keluar.',
  },
  {
    icon: 'clip' as const,
    title: 'Lampiran ikut sepanjang rute',
    body: 'Tanpa hard copy berpindah meja, paraf dan tanda tangan digital.',
  },
]

/**
 * Login screen. The password is not checked — once the backend is ready, submit
 * calls authApi.signIn() and the result fills sessionAtom.
 */
export default function Login() {
  const [session, setSession] = useAtom(sessionAtom)
  const [roleId, setRoleId] = useState(session.roleId)
  const [password, setPassword] = useState('prototipe')
  const navigate = useNavigate()
  const role = roleById(roleId)

  const signIn = () => {
    setSession({ loggedIn: true, roleId })
    navigate(isObserver(role) ? '/monitoring' : '/')
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
            {PROMISES.map((promise) => (
              <div className="login-point" key={promise.title}>
                <span className="lp-ico">
                  <Icon name={promise.icon} size={16} strokeWidth={1.8} />
                </span>
                <span>
                  <b>{promise.title}</b>
                  <span>{promise.body}</span>
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
            signIn()
          }}
        >
          <span className="proto-tag">
            <Icon name="alert" size={12} strokeWidth={2} /> Prototipe · data contoh
          </span>
          <h2>Masuk ke akun Anda</h2>
          <p className="sub">Gunakan email institusi yang terdaftar di cluster Anda.</p>

          <div className="field">
            <label id="lb-account">
              <Icon name="shield" size={11} strokeWidth={2} /> Masuk sebagai
            </label>
            <AccountSelect value={roleId} onPick={setRoleId} labelId="lb-account" />
          </div>

          <div className="field">
            <label htmlFor="lg-mail">
              <Icon name="mail" size={11} strokeWidth={2} /> Email institusi
            </label>
            <input id="lg-mail" type="email" readOnly value={emailFor(role.name)} autoComplete="username" />
          </div>

          <div className="field">
            <label htmlFor="lg-pass">
              <Icon name="lock" size={11} strokeWidth={2} /> Kata sandi
            </label>
            <input
              id="lg-pass"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="login-row">
            <label htmlFor="lg-remember">
              <input id="lg-remember" type="checkbox" defaultChecked /> Ingat saya di perangkat ini
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
