import { atom } from 'jotai'
import { RUTE_AWAL } from '@/constants/peran'
import { TAHAPAN_AWAL } from '@/constants/tahapan'
import type { Kategori, RuteKategori, Tahap } from '@/types'

/**
 * Aturan alur yang bisa diubah Super Admin saat aplikasi berjalan:
 * batas waktu tiap tahap dan rute kategori → sekret. Keduanya dipakai
 * di seluruh layar, jadi mengubah satu angka langsung terasa di papan
 * pemantauan dan penanda SLA di daftar berkas.
 */
export interface AlurState {
  readonly tahapan: readonly Tahap[]
  readonly rute: RuteKategori
}

export const alurAtom = atom<AlurState>({
  tahapan: TAHAPAN_AWAL,
  rute: RUTE_AWAL,
})

/** Batas hari baru untuk satu tahap, dijepit ke 1..14. */
export const ubahSla = (state: AlurState, indeks: number, hari: number): AlurState => ({
  ...state,
  tahapan: state.tahapan.map((tahap, i) =>
    i === indeks && tahap.sla !== null ? { ...tahap, sla: Math.min(14, Math.max(1, hari)) } : tahap,
  ),
})

/** Arahkan satu kategori ke sekret lain. Berlaku untuk pengajuan baru. */
export const ubahRute = (state: AlurState, kategori: Kategori, sekretId: string): AlurState => ({
  ...state,
  rute: { ...state.rute, [kategori]: sekretId },
})
