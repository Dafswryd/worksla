import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { memegang, pemantau, terlihat } from '@imeri/shared'
import { Toaster } from '@/components/Toaster'
import { alurAtom } from '@/stores/alurAtom'
import { pengajuanAtom } from '@/stores/pengajuanAtom'
import { peranAktifAtom, sesiAtom } from '@/stores/sesiAtom'
import { berkasTerbukaAtom, cariAtom, saringAtom } from '@/stores/uiAtom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { NavGroup } from './Sidebar'

/** Judul breadcrumb per rute. */
const CRUMB: Readonly<Record<string, string>> = {
  '/': 'Kotak masuk',
  '/berkas': 'Semua berkas',
  '/pemantauan': 'Ringkasan',
  '/beban': 'Beban kerja',
  '/aturan': 'Aturan alur',
}

const Layout = () => {
  const [sesi, setSesi] = useAtom(sesiAtom)
  const peran = useAtomValue(peranAktifAtom)
  const daftar = useAtomValue(pengajuanAtom)
  const { tahapan } = useAtomValue(alurAtom)
  const setCari = useSetAtom(cariAtom)
  const setSaring = useSetAtom(saringAtom)
  const setTerbuka = useSetAtom(berkasTerbukaAtom)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Seluruh aplikasi ada di balik halaman masuk.
  if (!sesi.masuk) return <Navigate to="/login" replace />

  const dalamLingkup = daftar.filter((item) => terlihat(item, peran))
  const perluSaya = dalamLingkup.filter((item) => memegang(item, peran, tahapan)).length
  const selesai = dalamLingkup.filter((item) => item.status === 'selesai').length
  const memantau = pemantau(peran)

  const groups: readonly NavGroup[] = memantau
    ? [
        {
          judul: peran.tipe === 'admin' ? 'Pemantauan pusat' : `Cluster ${peran.cluster ?? ''}`,
          items: [
            { id: 'pemantauan', label: 'Ringkasan', ikon: 'chart', to: '/pemantauan' },
            {
              id: 'berkas',
              label: peran.tipe === 'admin' ? 'Semua berkas' : 'Berkas cluster',
              ikon: 'file',
              to: '/berkas',
              badge: dalamLingkup.length,
            },
            { id: 'beban', label: 'Beban kerja', ikon: 'people', to: '/beban' },
          ],
        },
        ...(peran.tipe === 'admin'
          ? [
              {
                judul: 'Administrasi',
                items: [{ id: 'aturan' as const, label: 'Aturan alur', ikon: 'gear' as const, to: '/aturan' }],
              },
            ]
          : []),
      ]
    : [
        {
          judul: 'Meja kerja',
          items: [
            { id: 'kotak', label: 'Kotak masuk', ikon: 'inbox', to: '/', badge: perluSaya, panas: perluSaya > 0 },
            { id: 'berkas', label: 'Semua berkas', ikon: 'file', to: '/berkas', badge: dalamLingkup.length },
            { id: 'arsip', label: 'Arsip', ikon: 'archive', to: '/berkas', badge: selesai },
          ],
        },
      ]

  const aktif =
    pathname === '/'
      ? 'kotak'
      : pathname.startsWith('/pemantauan')
        ? 'pemantauan'
        : pathname.startsWith('/beban')
          ? 'beban'
          : pathname.startsWith('/aturan')
            ? 'aturan'
            : pathname.startsWith('/berkas')
              ? 'berkas'
              : ''

  return (
    <div className="app">
      <Sidebar
        groups={groups}
        aktif={aktif}
        peran={peran}
        onNavigate={(to) => navigate(to)}
        onKeluar={() => {
          setTerbuka(null)
          setSesi({ ...sesi, masuk: false })
          navigate('/login')
        }}
      />

      <main className="main">
        <Topbar
          akar={memantau ? 'Pemantauan' : 'Pengajuan'}
          breadcrumb={CRUMB[pathname] ?? 'Halaman'}
          peran={peran}
          onGantiPeran={(peranId) => {
            // Ganti peran = ganti lingkup; saringan dan panel detail ikut direset.
            setSesi({ ...sesi, peranId })
            setCari('')
            setSaring({ kategori: 'semua', cluster: 'semua' })
            setTerbuka(null)
            navigate('/')
          }}
        />
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}

export default Layout
