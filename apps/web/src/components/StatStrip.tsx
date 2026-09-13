import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/types'

export interface StatItem {
  readonly label: string
  readonly icon: IconName
  readonly value: ReactNode
  readonly caption: string
}

/** The four number tiles at the head of a page. */
export function StatStrip({ items }: { readonly items: readonly StatItem[] }) {
  return (
    <div className="stats">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <div className="stat-label">
            <Icon name={item.icon} size={13} strokeWidth={2} />
            {item.label}
          </div>
          <div className="stat-value num">{item.value}</div>
          <div className="stat-caption">{item.caption}</div>
        </div>
      ))}
    </div>
  )
}
