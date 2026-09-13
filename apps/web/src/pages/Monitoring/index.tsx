import { Navigate, useNavigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { isObserver, isVisible } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { StatStrip } from '@/components/StatStrip'
import { SubmissionDrawer } from '@/components/submission/SubmissionDrawer'
import { CLUSTER_STATS } from '@/constants/staff'
import { backlogByStage, summarize, workloadRows } from '@/helpers/monitoring'
import { flowAtom } from '@/stores/flowAtom'
import { submissionsAtom } from '@/stores/submissionAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { openCodeAtom } from '@/stores/uiAtom'
import { Backlog } from './components/Backlog'
import { ClusterCompare } from './components/ClusterCompare'
import { Overdue } from './components/Overdue'
import { ScopeBar } from './components/ScopeBar'
import { Throughput } from './components/Throughput'
import { WorkloadTable } from './components/WorkloadTable'

/** Average days to completion: one cluster for a monitor, the mean of four for an admin. */
function averageCompletion(cluster: string | undefined): number {
  const all = Object.values(CLUSTER_STATS)
  if (cluster === undefined) return all.reduce((total, item) => total + item.avgDays, 0) / all.length
  return CLUSTER_STATS[cluster as keyof typeof CLUSTER_STATS]?.avgDays ?? 0
}

export default function Monitoring() {
  const role = useAtomValue(activeRoleAtom)
  const list = useAtomValue(submissionsAtom)
  const { stages, route } = useAtomValue(flowAtom)
  const [openCode, setOpenCode] = useAtom(openCodeAtom)
  const navigate = useNavigate()

  // This board is for the super admin and cluster monitors only.
  if (!isObserver(role)) return <Navigate to="/" replace />

  const scoped = list.filter((item) => isVisible(item, role))
  const summary = summarize(scoped, stages)
  const average = averageCompletion(role.type === 'monitor' ? role.cluster : undefined)
  const opened = openCode === null ? undefined : list.find((item) => item.code === openCode)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {role.type === 'admin' ? 'Ringkasan seluruh instansi' : `Cluster ${role.cluster}`}
          </h1>
          <p className="page-sub">
            {role.type === 'admin'
              ? 'Pergerakan berkas, penumpukan per meja, dan beban kerja di semua cluster.'
              : `Pergerakan berkas dan beban kerja pegawai di Cluster ${role.cluster}. Hanya berkas cluster ini yang terlihat.`}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/documents')}>
            <Icon name="file" size={16} strokeWidth={2} /> Lihat daftar berkas
          </button>
        </div>
      </div>

      <ScopeBar role={role} documentCount={scoped.length} />

      <StatStrip
        items={[
          {
            label: 'Berkas aktif',
            icon: 'file',
            value: summary.active.length,
            caption: 'sedang berjalan di semua tahap',
          },
          {
            label: 'Lewat SLA',
            icon: 'clock',
            value: (
              <>
                {summary.overdue.length}
                {summary.overdue.length > 0 ? <Chip tone="amber">{summary.overdueRatio}%</Chip> : null}
              </>
            ),
            caption: summary.overdue.length > 0 ? 'menunggu ditagih' : 'semua dalam batas',
          },
          {
            label: 'Tingkat pengembalian',
            icon: 'rotateBack',
            value: `${summary.returnRatio}%`,
            caption: `${summary.returned.length} berkas dikembalikan ke meja sebelumnya`,
          },
          {
            label: 'Rata-rata selesai',
            icon: 'check',
            value: (
              <>
                {average.toFixed(1)}
                <Chip tone="slate">hari</Chip>
              </>
            ),
            caption: 'dari kirim sampai arsip',
          },
        ]}
      />

      <div className="mgrid">
        <div className="m8">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Berkas menumpuk di meja mana</span>
              <Chip tone="slate" numeric>
                {summary.active.length} aktif
              </Chip>
            </div>
            <Backlog rows={backlogByStage(summary.active, stages)} />
          </div>
        </div>

        <div className="m4">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Pergerakan 14 hari</span>
            </div>
            <Throughput />
          </div>
        </div>

        <div className="m8">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Beban kerja pegawai</span>
              <button type="button" className="link-btn" onClick={() => navigate('/workload')}>
                Lihat semua <Icon name="arrowRight" size={14} strokeWidth={2} />
              </button>
            </div>
            <WorkloadTable rows={workloadRows(scoped, stages, route, role)} full={false} />
          </div>
        </div>

        <div className="m4">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Perlu ditagih</span>
              {summary.overdue.length > 0 ? (
                <Chip tone="amber" numeric>
                  {summary.overdue.length}
                </Chip>
              ) : null}
            </div>
            <Overdue list={summary.overdue} onOpen={(code) => setOpenCode(code)} />
          </div>
        </div>

        {role.type === 'admin' ? (
          <div className="m12">
            <ClusterCompare list={list} />
          </div>
        ) : null}
      </div>

      {opened ? <SubmissionDrawer submission={opened} onClose={() => setOpenCode(null)} /> : null}
    </div>
  )
}
