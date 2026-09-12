import { useAtom } from 'jotai'
import { Icon } from '@/components/Icon'
import { PERAN } from '@/constants/peran'
import { cariAtom } from '@/stores/uiAtom'
import type { Peran } from '@/types'

interface TopbarProps {
  readonly akar: string
  readonly breadcrumb: string
  readonly peran: Peran
  readonly onGantiPeran: (peranId: string) => void
}

export function Topbar({ akar, breadcrumb, peran, onGantiPeran }: TopbarProps) {
  const [cari, setCari] = useAtom(cariAtom)

  return (
    <header className="topbar">
      <div className="crumb">
        <span className="crumb-root">{akar}</span>
        <span className="slash">/</span>
        <span className="crumb-current">{breadcrumb}</span>
      </div>

      <div className="search">
        <span className="s-ico">
          <Icon name="search" size={15} strokeWidth={2} />
        </span>
        <input
          type="search"
          value={cari}
          placeholder="Cari judul atau nomor…"
          aria-label="Cari pengajuan"
          onChange={(event) => setCari(event.target.value)}
        />
      </div>

      {/* Pengalih peran khusus prototipe — hilang begitu autentikasi nyata dipasang. */}
      <div className="role-pick">
        <label htmlFor="peran">Masuk sebagai</label>
        <select
          id="peran"
          className="task-select"
          value={peran.id}
          onChange={(event) => onGantiPeran(event.target.value)}
        >
          {Object.values(PERAN).map((kandidat) => (
            <option value={kandidat.id} key={kandidat.id}>
              {kandidat.nama} — {kandidat.jab}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
