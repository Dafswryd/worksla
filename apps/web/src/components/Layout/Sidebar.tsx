import { Icon } from '@/components/Icon'
import type { IconName, Peran } from '@/types'

export interface NavItem {
  readonly id: string
  readonly label: string
  readonly ikon: IconName
  readonly to: string
  readonly badge?: number
  readonly panas?: boolean
}

export interface NavGroup {
  readonly judul: string
  readonly items: readonly NavItem[]
}

interface SidebarProps {
  readonly groups: readonly NavGroup[]
  readonly aktif: string
  readonly peran: Peran
  readonly onNavigate: (to: string) => void
  readonly onKeluar: () => void
}

export function Sidebar({ groups, aktif, peran, onNavigate, onKeluar }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img className="brand-logo-img" src="/logo/imeri-compact.png" alt="IMERI" />
          <img className="brand-mark-img" src="/logo/imeri-mark.png" alt="IMERI" />
        </div>
      </div>

      {groups.map((group, indeks) => (
        <div key={group.judul}>
          {indeks > 0 ? <div className="nav-sep" /> : null}
          <p className="nav-label">{group.judul}</p>
          <ul className="nav">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === aktif ? 'is-active' : undefined}
                  onClick={() => onNavigate(item.to)}
                >
                  <Icon name={item.ikon} size={17} />
                  <span className="nav-text">{item.label}</span>
                  {item.badge ? (
                    <span className={item.panas ? 'nav-badge hot num' : 'nav-badge num'}>{item.badge}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="user-card">
        <span className="avatar">{peran.ini}</span>
        <div className="user-meta">
          <div className="user-name">{peran.nama}</div>
          <div className="user-plan">{peran.jab}</div>
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Keluar"
          aria-label="Keluar"
          style={{ marginLeft: 'auto', flex: 'none' }}
          onClick={onKeluar}
        >
          <Icon name="logout" size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
