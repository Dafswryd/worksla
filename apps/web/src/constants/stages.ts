import type { Stage, StageKey } from '@/types'

/**
 * The six stages a document passes through. The `sla` numbers are starting
 * values — the super admin can change them at runtime through `flowAtom`.
 */
export const DEFAULT_STAGES: readonly Stage[] = [
  { key: 'submitter', desk: 'Pengaju', action: 'Penyusunan berkas', sla: null },
  { key: 'secretary', desk: 'Sekret', action: 'Verifikasi berkas', sla: 1 },
  { key: 'deputy', desk: 'Wadir', action: 'QC & paraf', sla: 2 },
  { key: 'director', desk: 'Direktur', action: 'Persetujuan', sla: 2 },
  { key: 'recording', desk: 'Sekret', action: 'Rekam & arsip', sla: 1 },
  { key: 'done', desk: 'Pengaju', action: 'Selesai', sla: null },
]

/** "Move forward" button label per stage. */
export const ADVANCE_LABEL: Partial<Record<StageKey, string>> = {
  submitter: 'Ajukan ulang',
  secretary: 'Teruskan ke Wadir',
  deputy: 'Paraf & teruskan ke Direktur',
  director: 'Setujui & tanda tangani',
  recording: 'Rekam & beri tahu pengaju',
}

/** "Send back" button label per stage; the submitter stage has none. */
export const RETURN_LABEL: Partial<Record<StageKey, string>> = {
  secretary: 'Kembalikan ke pengaju',
  deputy: 'Kembalikan ke Sekret',
  director: 'Kembalikan ke Wadir',
  recording: 'Kembalikan ke Direktur',
}

/** History sentence recorded when a document moves on from a given stage. */
export const ADVANCE_TRAIL: Partial<Record<StageKey, string>> = {
  submitter: 'mengajukan ulang setelah perbaikan',
  secretary: 'meneruskan ke Wadir',
  deputy: 'memberi paraf dan meneruskan ke Direktur',
  director: 'menyetujui dan menandatangani',
  recording: 'merekam hasil dan memberi tahu pengaju',
}
