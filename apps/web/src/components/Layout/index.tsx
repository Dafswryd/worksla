import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { isHolder, isObserver, isVisible } from '@imeri/shared'
import { Toaster } from '@/components/Toaster'
import { flowAtom } from '@/stores/flowAtom'
import { submissionsAtom } from '@/stores/submissionAtom'
import { activeRoleAtom, sessionAtom } from '@/stores/sessionAtom'
import { filtersAtom, openCodeAtom, searchAtom } from '@/stores/uiAtom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { NavGroup } from './Sidebar'

/** Breadcrumb title per route. */
const CRUMB: Readonly<Record<string, string>> = {
  '/': 'Kotak masuk',
  '/documents': 'Semua berkas',
  '/monitoring': 'Ringkasan',
  '/workload': 'Beban kerja',
  '/flow-rules': 'Aturan alur',
}

const Layout = () => {
  const [session, setSession] = useAtom(sessionAtom)
  const role = useAtomValue(activeRoleAtom)
  const list = useAtomValue(submissionsAtom)
  const { stages } = useAtomValue(flowAtom)
  const setSearch = useSetAtom(searchAtom)
  const setFilters = useSetAtom(filtersAtom)
  const setOpenCode = useSetAtom(openCodeAtom)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // The whole app sits behind the login screen.
  if (!session.loggedIn) return <Navigate to="/login" replace />

  const inScope = list.filter((item) => isVisible(item, role))
  const mine = inScope.filter((item) => isHolder(item, role, stages)).length
  const done = inScope.filter((item) => item.status === 'done').length
  const observing = isObserver(role)

  const groups: readonly NavGroup[] = observing
    ? [
        {
          title: role.type === 'admin' ? 'Pemantauan pusat' : `Cluster ${role.cluster ?? ''}`,
          items: [
            { id: 'monitoring', label: 'Ringkasan', icon: 'chart', to: '/monitoring' },
            {
              id: 'documents',
              label: role.type === 'admin' ? 'Semua berkas' : 'Berkas cluster',
              icon: 'file',
              to: '/documents',
              badge: inScope.length,
            },
            { id: 'workload', label: 'Beban kerja', icon: 'people', to: '/workload' },
          ],
        },
        ...(role.type === 'admin'
          ? [
              {
                title: 'Administrasi',
                items: [
                  { id: 'flow-rules' as const, label: 'Aturan alur', icon: 'gear' as const, to: '/flow-rules' },
                ],
              },
            ]
          : []),
      ]
    : [
        {
          title: 'Meja kerja',
          items: [
            { id: 'inbox', label: 'Kotak masuk', icon: 'inbox', to: '/', badge: mine, hot: mine > 0 },
            { id: 'documents', label: 'Semua berkas', icon: 'file', to: '/documents', badge: inScope.length },
            { id: 'archive', label: 'Arsip', icon: 'archive', to: '/documents', badge: done },
          ],
        },
      ]

  const active =
    pathname === '/'
      ? 'inbox'
      : pathname.startsWith('/monitoring')
        ? 'monitoring'
        : pathname.startsWith('/workload')
          ? 'workload'
          : pathname.startsWith('/flow-rules')
            ? 'flow-rules'
            : pathname.startsWith('/documents')
              ? 'documents'
              : ''

  return (
    <div className="app">
      <Sidebar
        groups={groups}
        active={active}
        role={role}
        onNavigate={(to) => navigate(to)}
        onSignOut={() => {
          setOpenCode(null)
          setSession({ ...session, loggedIn: false })
          navigate('/login')
        }}
      />

      <main className="main">
        <Topbar
          root={observing ? 'Pemantauan' : 'Pengajuan'}
          breadcrumb={CRUMB[pathname] ?? 'Halaman'}
          role={role}
          onSwitchRole={(roleId) => {
            // Switching role switches scope; filters and the detail panel reset with it.
            setSession({ ...session, roleId })
            setSearch('')
            setFilters({ category: 'all', cluster: 'all' })
            setOpenCode(null)
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
