import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const KotakMasuk = lazy(() => import('@/pages/KotakMasuk'))
const Berkas = lazy(() => import('@/pages/Berkas'))
const Pemantauan = lazy(() => import('@/pages/Pemantauan'))
const BebanKerja = lazy(() => import('@/pages/BebanKerja'))
const AturanAlur = lazy(() => import('@/pages/AturanAlur'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const routes: RouteObject[] = [
  { index: true, element: <KotakMasuk /> },
  { path: 'berkas', element: <Berkas /> },
  { path: 'pemantauan', element: <Pemantauan /> },
  { path: 'beban', element: <BebanKerja /> },
  { path: 'aturan', element: <AturanAlur /> },
  { path: '*', element: <NotFound /> },
]

export default routes
