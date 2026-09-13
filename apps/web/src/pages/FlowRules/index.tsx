import { Navigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { CATEGORY_LABEL } from '@/constants/labels'
import { ALL_CATEGORIES, ROLES, roleById } from '@/constants/roles'
import { STAGE_LABEL } from '@/constants/stages'
import { flowAtom, setCategoryRoute, setStageSla } from '@/stores/flowAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { useToast } from '@/stores/toastAtom'
import type { Category } from '@/types'

/**
 * The only screen that changes the rules, and only the super admin opens it.
 * Changing one number here changes the SLA markers across every document list
 * and the figures on the monitoring board.
 */
export default function FlowRules() {
  const role = useAtomValue(activeRoleAtom)
  const [flow, setFlow] = useAtom(flowAtom)
  const toast = useToast()

  if (role.type !== 'admin') return <Navigate to="/" replace />

  const secretaries = Object.values(ROLES).filter((candidate) => candidate.type === 'secretary')

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
              {flow.stages.map((stage, index) =>
                stage.sla === null ? null : (
                  <div className="rule-row" key={`${stage.key}-${index}`}>
                    <span className="rule-name">
                      {STAGE_LABEL[stage.key].desk} — {STAGE_LABEL[stage.key].action}
                      <small>Tahap {index} dari {flow.stages.length - 1}</small>
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={stage.sla}
                      aria-label={`Batas hari ${STAGE_LABEL[stage.key].action}`}
                      onChange={(event) => {
                        const days = Number(event.target.value)
                        if (Number.isNaN(days)) return
                        setFlow((prev) => setStageSla(prev, index, days))
                      }}
                      onBlur={() => toast(`Batas ${STAGE_LABEL[stage.key].desk} — ${STAGE_LABEL[stage.key].action} disimpan`)}
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
              {ALL_CATEGORIES.map((category: Category) => (
                <div className="rule-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 132px' }} key={category}>
                  <span className="rule-name">{CATEGORY_LABEL[category]}</span>
                  <select
                    className="task-select"
                    aria-label={`Sekret untuk ${CATEGORY_LABEL[category]}`}
                    value={flow.route[category]}
                    onChange={(event) => {
                      const secretaryId = event.target.value
                      setFlow((prev) => setCategoryRoute(prev, category, secretaryId))
                      toast(
                        `Kategori ${CATEGORY_LABEL[category]} sekarang dirutekan ke ${roleById(secretaryId).name}`,
                      )
                    }}
                  >
                    {secretaries.map((secretary) => (
                      <option value={secretary.id} key={secretary.id}>
                        {secretary.name}
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
