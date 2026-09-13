import { PENGAJUAN_SEED } from '@/constants/pengajuan'
import { http, modeApi } from './http'
import type { Kategori, Pengajuan } from '@/types'

/**
 * Titik sambung ke backend. Sekarang setiap fungsi jatuh ke seed lokal;
 * begitu `VITE_API_BASE` diisi, panggilan HTTP-nya yang dipakai dan
 * komponen di atasnya tidak perlu diubah.
 */
export const pengajuanApi = {
  daftar: async (): Promise<readonly Pengajuan[]> => {
    if (!modeApi()) return PENGAJUAN_SEED
    return http.get<readonly Pengajuan[]>('/pengajuan')
  },

  teruskan: async (kode: string): Promise<void> => {
    if (!modeApi()) return
    await http.post<void>(`/pengajuan/${kode}/teruskan`, {})
  },

  kembalikan: async (kode: string, komentar: readonly string[]): Promise<void> => {
    if (!modeApi()) return
    await http.post<void>(`/pengajuan/${kode}/kembalikan`, { komentar })
  },

  buat: async (judul: string, kategori: Kategori): Promise<void> => {
    if (!modeApi()) return
    await http.post<void>('/pengajuan', { judul, kategori })
  },
}

export default pengajuanApi
