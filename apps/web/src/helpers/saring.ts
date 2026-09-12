import { terlihat } from '@imeri/shared'
import type { Pengajuan, Peran } from '@/types'
import type { SaringState } from '@/stores/uiAtom'

/** Berkas dalam lingkup peran, lalu disaring kategori, cluster, dan kata kunci. */
export function saringDaftar(
  daftar: readonly Pengajuan[],
  peran: Peran,
  saring: SaringState,
  cari: string,
): readonly Pengajuan[] {
  const kunci = cari.trim().toLowerCase()

  return daftar.filter((item) => {
    if (!terlihat(item, peran)) return false
    if (saring.kategori !== 'semua' && item.kategori !== saring.kategori) return false
    if (saring.cluster !== 'semua' && item.cluster !== saring.cluster) return false
    if (kunci === '') return true
    return `${item.judul} ${item.kode} ${item.pemohon}`.toLowerCase().includes(kunci)
  })
}
