import { useAtom, useSetAtom } from 'jotai'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { SEMUA_CLUSTER } from '@/constants/pegawai'
import { SEMUA_KATEGORI } from '@/constants/peran'
import { cariAtom, saringAtom } from '@/stores/uiAtom'
import type { Cluster, Kategori, Peran } from '@/types'

interface FilterBarProps {
  readonly peran: Peran
}

/**
 * Saringan kategori dan cluster. Sekret terkunci ke kategorinya dan monitor
 * terkunci ke clusternya — penguncian itu bagian dari aturan, bukan sekadar
 * kenyamanan, jadi kontrolnya dinonaktifkan dan alasannya ditulis.
 */
export function FilterBar({ peran }: FilterBarProps) {
  const [saring, setSaring] = useAtom(saringAtom)
  const setCari = useSetAtom(cariAtom)

  const kunciKategori = peran.tipe === 'sekret'
  const kunciCluster = peran.tipe === 'monitor'

  return (
    <div className="filterbar">
      <span className="stat-label" style={{ margin: 0 }}>
        <Icon name="filter" size={13} strokeWidth={2} /> Saring
      </span>

      <select
        className="task-select"
        aria-label="Saring kategori"
        disabled={kunciKategori}
        value={kunciKategori ? (peran.kategori ?? 'semua') : saring.kategori}
        onChange={(event) => setSaring({ ...saring, kategori: event.target.value as Kategori | 'semua' })}
      >
        <option value="semua">Semua kategori</option>
        {SEMUA_KATEGORI.map((kategori) => (
          <option value={kategori} key={kategori}>
            {kategori}
          </option>
        ))}
      </select>

      <select
        className="task-select"
        aria-label="Saring cluster"
        disabled={kunciCluster}
        value={kunciCluster ? (peran.cluster ?? 'semua') : saring.cluster}
        onChange={(event) => setSaring({ ...saring, cluster: event.target.value as Cluster | 'semua' })}
      >
        <option value="semua">Semua cluster</option>
        {SEMUA_CLUSTER.map((cluster) => (
          <option value={cluster} key={cluster}>
            {cluster}
          </option>
        ))}
      </select>

      {kunciKategori ? (
        <Chip tone="blue">
          <Icon name="people" size={12} strokeWidth={2} />
          &nbsp; Terkunci ke kategori {peran.kategori}
        </Chip>
      ) : null}
      {kunciCluster ? <Chip tone="blue">Terkunci ke Cluster {peran.cluster}</Chip> : null}

      <button
        type="button"
        className="filter-reset"
        onClick={() => {
          setSaring({ kategori: 'semua', cluster: 'semua' })
          setCari('')
        }}
      >
        Atur ulang
      </button>
    </div>
  )
}
