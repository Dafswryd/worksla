import { Navigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { isObserver, isVisible } from '@imeri/shared'
import { workloadRows } from '@/helpers/monitoring'
import { flowAtom } from '@/stores/flowAtom'
import { submissionsAtom } from '@/stores/submissionAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { WorkloadTable } from '@/pages/Monitoring/components/WorkloadTable'

/** Full workload board — every column, every staff member in scope. */
export default function Workload() {
  const role = useAtomValue(activeRoleAtom)
  const list = useAtomValue(submissionsAtom)
  const { stages } = useAtomValue(flowAtom)

  if (!isObserver(role)) return <Navigate to="/" replace />

  const scoped = list.filter((item) => isVisible(item, role))

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Beban kerja</h1>
          <p className="page-sub">
            {role.type === 'admin'
              ? 'Siapa memegang berapa berkas saat ini, dan berapa di antaranya sudah lewat batas.'
              : `Pegawai Cluster ${role.cluster} beserta meja yang memproses berkas mereka.`}
          </p>
        </div>
      </div>

      <div className="card">
        <WorkloadTable rows={workloadRows(scoped, stages, role)} full />
      </div>
    </div>
  )
}
