import type { ReactNode } from 'react'
import { lewatSla } from '@imeri/shared'
import type { Pengajuan, Tahap } from '@/types'

export type ChipTone = 'netral' | 'red' | 'amber' | 'green' | 'blue' | 'slate' | 'purple'

const KELAS: Record<ChipTone, string> = {
  netral: 'chip',
  red: 'chip t-red',
  amber: 'chip t-amber',
  green: 'chip t-green',
  blue: 'chip t-blue',
  slate: 'chip t-slate',
  purple: 'chip t-purple',
}

interface ChipProps {
  readonly tone?: ChipTone
  readonly angka?: boolean
  readonly children: ReactNode
}

export function Chip({ tone = 'netral', angka = false, children }: ChipProps) {
  return <span className={angka ? `${KELAS[tone]} num` : KELAS[tone]}>{children}</span>
}

/** Chip status berkas — satu tempat supaya warnanya konsisten di semua tabel. */
export function StatusChip({ pengajuan, tahapan }: { readonly pengajuan: Pengajuan; readonly tahapan: readonly Tahap[] }) {
  if (pengajuan.status === 'selesai') return <Chip tone="green">Selesai</Chip>
  if (pengajuan.status === 'dikembalikan') return <Chip tone="red">Dikembalikan</Chip>
  if (lewatSla(pengajuan, tahapan)) return <Chip tone="amber">Lewat SLA</Chip>
  return <Chip tone="blue">Berjalan</Chip>
}
