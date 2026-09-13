import { atom } from 'jotai'

export type TabKotak = 'tindakan' | 'jalan' | 'balik' | 'selesai'

export const JUDUL_TAB: Readonly<Record<TabKotak, string>> = {
  tindakan: 'Menunggu tindakan Anda',
  jalan: 'Berjalan di meja lain',
  balik: 'Dikembalikan dengan catatan',
  selesai: 'Sudah selesai',
}

export const tabAtom = atom<TabKotak>('tindakan')

/** Modal "buat pengajuan" sedang terbuka. */
export const buatTerbukaAtom = atom(false)
