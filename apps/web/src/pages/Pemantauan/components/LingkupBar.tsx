import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { STAT_CLUSTER } from '@/constants/pegawai'
import type { Peran } from '@/types'

interface LingkupBarProps {
  readonly peran: Peran
  readonly jumlahBerkas: number
}

/** Baris yang menegaskan sejauh mana data di layar ini berlaku. */
export function LingkupBar({ peran, jumlahBerkas }: LingkupBarProps) {
  return (
    <div className="scope-bar">
      <span className="stat-label">
        <Icon name="filter" size={13} strokeWidth={2} /> Lingkup
      </span>
      <Chip tone="blue">{peran.tipe === 'admin' ? 'Semua cluster (4)' : `Cluster ${peran.cluster}`}</Chip>
      <Chip>{jumlahBerkas} berkas</Chip>
      <Chip>Periode 14 hari terakhir</Chip>
      {peran.cluster ? (
        <Chip tone="slate">
          <Icon name="people" size={12} strokeWidth={2} />
          &nbsp; {STAT_CLUSTER[peran.cluster].pegawai} pegawai
        </Chip>
      ) : null}
      <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)', color: 'var(--ink-400)' }}>
        Hanya membaca — tidak bisa memberi paraf
      </span>
    </div>
  )
}
