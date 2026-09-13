import { useAtom } from 'jotai'
import { Icon } from '@/components/Icon'
import { ROLES } from '@/constants/roles'
import { searchAtom } from '@/stores/uiAtom'
import type { Role } from '@/types'

interface TopbarProps {
  readonly root: string
  readonly breadcrumb: string
  readonly role: Role
  readonly onSwitchRole: (roleId: string) => void
}

export function Topbar({ root, breadcrumb, role, onSwitchRole }: TopbarProps) {
  const [search, setSearch] = useAtom(searchAtom)

  return (
    <header className="topbar">
      <div className="crumb">
        <span className="crumb-root">{root}</span>
        <span className="slash">/</span>
        <span className="crumb-current">{breadcrumb}</span>
      </div>

      <div className="search">
        <span className="s-ico">
          <Icon name="search" size={15} strokeWidth={2} />
        </span>
        <input
          type="search"
          value={search}
          placeholder="Cari judul atau nomor…"
          aria-label="Cari pengajuan"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* Prototype-only role switcher — it goes away once real auth is wired in. */}
      <div className="role-pick">
        <label htmlFor="role">Masuk sebagai</label>
        <select
          id="role"
          className="task-select"
          value={role.id}
          onChange={(event) => onSwitchRole(event.target.value)}
        >
          {Object.values(ROLES).map((candidate) => (
            <option value={candidate.id} key={candidate.id}>
              {candidate.name} — {candidate.position}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
