import { Icon } from '@/components/Icon'
import type { IconName, Role } from '@/types'

export interface NavItem {
  readonly id: string
  readonly label: string
  readonly icon: IconName
  readonly to: string
  readonly badge?: number
  readonly hot?: boolean
}

export interface NavGroup {
  readonly title: string
  readonly items: readonly NavItem[]
}

interface SidebarProps {
  readonly groups: readonly NavGroup[]
  readonly active: string
  readonly role: Role
  readonly onNavigate: (to: string) => void
  readonly onSignOut: () => void
}

export function Sidebar({ groups, active, role, onNavigate, onSignOut }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img className="brand-logo-img" src="/logo/imeri-compact.png" alt="IMERI" />
          <img className="brand-mark-img" src="/logo/imeri-mark.png" alt="IMERI" />
        </div>
      </div>

      {groups.map((group, index) => (
        <div key={group.title}>
          {index > 0 ? <div className="nav-sep" /> : null}
          <p className="nav-label">{group.title}</p>
          <ul className="nav">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === active ? 'is-active' : undefined}
                  onClick={() => onNavigate(item.to)}
                >
                  <Icon name={item.icon} size={17} />
                  <span className="nav-text">{item.label}</span>
                  {item.badge ? (
                    <span className={item.hot ? 'nav-badge hot num' : 'nav-badge num'}>{item.badge}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="user-card">
        <span className="avatar">{role.initials}</span>
        <div className="user-meta">
          <div className="user-name">{role.name}</div>
          <div className="user-plan">{role.position}</div>
        </div>
        <button
          type="button"
          className="icon-btn"
          title="Keluar"
          aria-label="Keluar"
          style={{ marginLeft: 'auto', flex: 'none' }}
          onClick={onSignOut}
        >
          <Icon name="logout" size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
