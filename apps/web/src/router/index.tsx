import { lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import Layout from '@/components/Layout'
import routes from './routes'

const Login = lazy(() => import('@/pages/Login'))

const AppRouter = () => {
  const element = useRoutes([
    // Halaman masuk berada di luar kerangka aplikasi.
    { path: '/login', element: <Login /> },
    { path: '/', element: <Layout />, children: routes },
  ])

  return <Suspense fallback={<div className="canvas">Memuat…</div>}>{element}</Suspense>
}

export default AppRouter
