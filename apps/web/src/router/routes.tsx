import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const Inbox = lazy(() => import('@/pages/Inbox'))
const Documents = lazy(() => import('@/pages/Documents'))
const Monitoring = lazy(() => import('@/pages/Monitoring'))
const Workload = lazy(() => import('@/pages/Workload'))
const FlowRules = lazy(() => import('@/pages/FlowRules'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const routes: RouteObject[] = [
  { index: true, element: <Inbox /> },
  { path: 'documents', element: <Documents /> },
  { path: 'monitoring', element: <Monitoring /> },
  { path: 'workload', element: <Workload /> },
  { path: 'flow-rules', element: <FlowRules /> },
  { path: '*', element: <NotFound /> },
]

export default routes
