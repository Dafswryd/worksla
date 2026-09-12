import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/types'

export interface StatItem {
  readonly label: string
  readonly ikon: IconName
  readonly nilai: ReactNode
  readonly keterangan: string
}

/** Empat kotak angka di kepala halaman. */
export function StatStrip({ items }: { readonly items: readonly StatItem[] }) {
  return (
    <div className="stats">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <div className="stat-label">
            <Icon name={item.ikon} size={13} strokeWidth={2} />
            {item.label}
          </div>
          <div className="stat-value num">{item.nilai}</div>
          <div className="stat-caption">{item.keterangan}</div>
        </div>
      ))}
    </div>
  )
}
