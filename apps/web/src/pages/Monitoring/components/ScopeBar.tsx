import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { CLUSTER_STATS } from '@/constants/staff'
import type { Role } from '@/types'

interface ScopeBarProps {
  readonly role: Role
  readonly documentCount: number
}

/** A line that spells out how far the data on this screen reaches. */
export function ScopeBar({ role, documentCount }: ScopeBarProps) {
  return (
    <div className="scope-bar">
      <span className="stat-label">
        <Icon name="filter" size={13} strokeWidth={2} /> Lingkup
      </span>
      <Chip tone="blue">{role.type === 'admin' ? 'Semua cluster (4)' : `Cluster ${role.cluster}`}</Chip>
      <Chip>{documentCount} berkas</Chip>
      <Chip>Periode 14 hari terakhir</Chip>
      {role.cluster ? (
        <Chip tone="slate">
          <Icon name="people" size={12} strokeWidth={2} />
          &nbsp; {CLUSTER_STATS[role.cluster].headcount} pegawai
        </Chip>
      ) : null}
      <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--ink-400)' }}>
        Hanya membaca — tidak bisa memberi paraf
      </span>
    </div>
  )
}
