import { isVisible } from '@imeri/shared'
import type { Role, Submission } from '@/types'
import type { FilterState } from '@/stores/uiAtom'

/** Documents within the role's scope, then narrowed by category, cluster, and search term. */
export function filterSubmissions(
  list: readonly Submission[],
  role: Role,
  filters: FilterState,
  search: string,
): readonly Submission[] {
  const term = search.trim().toLowerCase()

  return list.filter((item) => {
    if (!isVisible(item, role)) return false
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.cluster !== 'all' && item.cluster !== filters.cluster) return false
    if (term === '') return true
    return `${item.title} ${item.code} ${item.requester}`.toLowerCase().includes(term)
  })
}
