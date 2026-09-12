import { atom } from 'jotai'
import { peranDari } from '@/constants/peran'
import type { Peran } from '@/types'

/**
 * Sesi prototipe: satu peran aktif, tanpa token. Saat backend siap, atom ini
 * diisi dari `/auth/me` dan `peranId` diganti id pengguna sebenarnya.
 */
export interface SesiState {
  readonly masuk: boolean
  readonly peranId: string
}

export const sesiAtom = atom<SesiState>({ masuk: false, peranId: 'sari' })

/** Peran yang sedang aktif. */
export const peranAktifAtom = atom<Peran>((get) => peranDari(get(sesiAtom).peranId))
