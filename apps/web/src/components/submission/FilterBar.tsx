import { useAtom, useSetAtom } from 'jotai'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { CATEGORY_LABEL, CLUSTER_LABEL } from '@/constants/labels'
import { ALL_CLUSTERS } from '@/constants/staff'
import { ALL_CATEGORIES } from '@/constants/roles'
import { filtersAtom, searchAtom } from '@/stores/uiAtom'
import type { Category, Cluster, Role } from '@/types'

interface FilterBarProps {
  readonly role: Role
}

/**
 * Category and cluster filters. A secretary is locked to their category and a
 * monitor to their cluster — that lock is part of the rules rather than a mere
 * convenience, so the control is disabled and the reason is spelled out.
 */
export function FilterBar({ role }: FilterBarProps) {
  const [filters, setFilters] = useAtom(filtersAtom)
  const setSearch = useSetAtom(searchAtom)

  const categoryLocked = role.type === 'secretary'
  const clusterLocked = role.type === 'monitor'

  return (
    <div className="filterbar">
      <span className="stat-label" style={{ margin: 0 }}>
        <Icon name="filter" size={13} strokeWidth={2} /> Saring
      </span>

      <select
        className="task-select"
        aria-label="Saring kategori"
        disabled={categoryLocked}
        value={categoryLocked ? (role.category ?? 'all') : filters.category}
        onChange={(event) => setFilters({ ...filters, category: event.target.value as Category | 'all' })}
      >
        <option value="all">Semua kategori</option>
        {ALL_CATEGORIES.map((category) => (
          <option value={category} key={category}>
            {CATEGORY_LABEL[category]}
          </option>
        ))}
      </select>

      <select
        className="task-select"
        aria-label="Saring cluster"
        disabled={clusterLocked}
        value={clusterLocked ? (role.cluster ?? 'all') : filters.cluster}
        onChange={(event) => setFilters({ ...filters, cluster: event.target.value as Cluster | 'all' })}
      >
        <option value="all">Semua cluster</option>
        {ALL_CLUSTERS.map((cluster) => (
          <option value={cluster} key={cluster}>
            {CLUSTER_LABEL[cluster]}
          </option>
        ))}
      </select>

      {categoryLocked ? (
        <Chip tone="blue">
          <Icon name="people" size={12} strokeWidth={2} />
          &nbsp; Terkunci ke kategori {role.category ? CATEGORY_LABEL[role.category] : ''}
        </Chip>
      ) : null}
      {clusterLocked ? (
        <Chip tone="blue">Terkunci ke Cluster {role.cluster ? CLUSTER_LABEL[role.cluster] : ''}</Chip>
      ) : null}

      <button
        type="button"
        className="filter-reset"
        onClick={() => {
          setFilters({ category: 'all', cluster: 'all' })
          setSearch('')
        }}
      >
        Atur ulang
      </button>
    </div>
  )
}
