import { peranDari } from '@/constants/peran'
import { http, modeApi } from './http'
import type { Peran } from '@/types'

/**
 * Autentikasi. Di prototipe, `masuk()` hanya mengembalikan peran yang dipilih
 * di halaman masuk — kata sandi tidak diperiksa dan tidak ada token.
 */
export const authApi = {
  masuk: async (peranId: string, sandi: string): Promise<Peran> => {
    if (!modeApi()) return peranDari(peranId)
    return http.post<Peran>('/auth/masuk', { peranId, sandi })
  },

  saya: async (peranId: string): Promise<Peran> => {
    if (!modeApi()) return peranDari(peranId)
    return http.get<Peran>('/auth/saya')
  },
}

export default authApi
