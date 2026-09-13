import { SUBMISSION_SEED } from '@/constants/submissions'
import { http, isApiMode } from './http'
import type { Category, Submission } from '@/types'

/**
 * Connection point to the backend. Every function falls back to the local seed
 * for now; once `VITE_API_BASE` is filled in the HTTP calls take over and the
 * components above need no change.
 */
export const submissionApi = {
  list: async (): Promise<readonly Submission[]> => {
    if (!isApiMode()) return SUBMISSION_SEED
    return http.get<readonly Submission[]>('/submissions')
  },

  advance: async (code: string): Promise<void> => {
    if (!isApiMode()) return
    await http.post<void>(`/submissions/${code}/advance`, {})
  },

  sendBack: async (code: string, comments: readonly string[]): Promise<void> => {
    if (!isApiMode()) return
    await http.post<void>(`/submissions/${code}/send-back`, { comments })
  },

  create: async (title: string, category: Category): Promise<void> => {
    if (!isApiMode()) return
    await http.post<void>('/submissions', { title, category })
  },
}

export default submissionApi
