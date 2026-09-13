import type { InboxTab } from '../atoms'

interface TabBarProps {
  readonly active: InboxTab
  readonly onPick: (tab: InboxTab) => void
  readonly counts: Readonly<Record<InboxTab, number>>
}

const LABELS: ReadonlyArray<readonly [InboxTab, string]> = [
  ['action', 'Perlu tindakan saya'],
  ['running', 'Sedang berjalan'],
  ['returned', 'Dikembalikan'],
  ['done', 'Selesai'],
]

export function TabBar({ active, onPick, counts }: TabBarProps) {
  return (
    <div className="tabs">
      {LABELS.map(([key, label]) => (
        <button
          type="button"
          key={key}
          className={key === active ? 'tab is-active' : 'tab'}
          onClick={() => onPick(key)}
        >
          {label}
          {counts[key] > 0 ? <span className="nav-badge num">{counts[key]}</span> : null}
        </button>
      ))}
    </div>
  )
}
