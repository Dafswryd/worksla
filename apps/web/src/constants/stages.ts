import { STAGE_ORDER } from '@imeri/shared'
import type { Stage, StageKey } from '@/types'

/** Indonesian screen labels for each desk. Never leaves the browser. */
export const STAGE_LABEL: Readonly<Record<StageKey, { desk: string; action: string }>> = {
  submitter: { desk: 'Pengaju', action: 'Penyusunan berkas' },
  secretary: { desk: 'Sekret', action: 'Verifikasi berkas' },
  deputy: { desk: 'Wadir', action: 'QC & paraf' },
  director: { desk: 'Direktur', action: 'Persetujuan' },
  recording: { desk: 'Sekret', action: 'Rekam & arsip' },
  done: { desk: 'Pengaju', action: 'Selesai' },
}

const DEFAULT_SLA: Readonly<Record<StageKey, number | null>> = {
  submitter: null,
  secretary: 1,
  deputy: 2,
  director: 2,
  recording: 1,
  done: null,
}

/** Starting rules; the super admin can change the SLA at runtime via flowAtom. */
export const DEFAULT_STAGES: readonly Stage[] = STAGE_ORDER.map((key) => ({ key, sla: DEFAULT_SLA[key] }))

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
