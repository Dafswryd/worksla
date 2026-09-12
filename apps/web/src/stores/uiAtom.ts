import { atom } from 'jotai'
import type { Cluster, Kategori } from '@/types'

/** Kata kunci pencarian di topbar — dipakai daftar berkas di beberapa halaman. */
export const cariAtom = atom('')

export type SaringKategori = Kategori | 'semua'
export type SaringCluster = Cluster | 'semua'

export interface SaringState {
  readonly kategori: SaringKategori
  readonly cluster: SaringCluster
}

export const saringAtom = atom<SaringState>({ kategori: 'semua', cluster: 'semua' })

/** Kode berkas yang panel detailnya sedang terbuka; null berarti tertutup. */
export const berkasTerbukaAtom = atom<string | null>(null)
