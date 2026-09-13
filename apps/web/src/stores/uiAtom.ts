import { atom } from 'jotai'
import type { Cluster, Category } from '@/types'

/** Topbar search term — read by the document list on several pages. */
export const searchAtom = atom('')

export type CategoryFilter = Category | 'all'
export type ClusterFilter = Cluster | 'all'

export interface FilterState {
  readonly category: CategoryFilter
  readonly cluster: ClusterFilter
}

export const filtersAtom = atom<FilterState>({ category: 'all', cluster: 'all' })

/** Code of the document whose detail panel is open; null means closed. */
export const openCodeAtom = atom<string | null>(null)
