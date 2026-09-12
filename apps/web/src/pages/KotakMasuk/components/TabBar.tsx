import type { TabKotak } from '../atoms'

interface TabBarProps {
  readonly aktif: TabKotak
  readonly onPilih: (tab: TabKotak) => void
  readonly jumlah: Readonly<Record<TabKotak, number>>
}

const LABEL: ReadonlyArray<readonly [TabKotak, string]> = [
  ['tindakan', 'Perlu tindakan saya'],
  ['jalan', 'Sedang berjalan'],
  ['balik', 'Dikembalikan'],
  ['selesai', 'Selesai'],
]

export function TabBar({ aktif, onPilih, jumlah }: TabBarProps) {
  return (
    <div className="tabs">
      {LABEL.map(([key, label]) => (
        <button
          type="button"
          key={key}
          className={key === aktif ? 'tab is-active' : 'tab'}
          onClick={() => onPilih(key)}
        >
          {label}
          {jumlah[key] > 0 ? <span className="nav-badge num">{jumlah[key]}</span> : null}
        </button>
      ))}
    </div>
  )
}
