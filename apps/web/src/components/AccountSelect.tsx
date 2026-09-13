import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { OBSERVER_ACCOUNTS, OPERATIONAL_ACCOUNTS, roleById } from '@/constants/roles'

interface AccountSelectProps {
  readonly value: string
  readonly onPick: (roleId: string) => void
  readonly labelId: string
}

/**
 * Account picker. Not a native <select> because each option has to carry an
 * avatar, a job title, and a selected marker.
 */
export function AccountSelect({ value, onPick, labelId }: AccountSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected = roleById(value)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const option = (id: string) => {
    const role = roleById(id)
    const active = role.id === value
    return (
      <button
        type="button"
        key={role.id}
        className={active ? 'sel-opt is-on' : 'sel-opt'}
        role="option"
        aria-selected={active}
        onClick={() => {
          onPick(role.id)
          setOpen(false)
        }}
      >
        <span className="acc-av">{role.initials}</span>
        <span className="acc-meta">
          <span className="acc-name">{role.name}</span>
          <span className="acc-position">{role.position}</span>
        </span>
        {active ? (
          <span className="acc-tick">
            <Icon name="check" size={16} strokeWidth={2} />
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="sel-wrap" ref={wrapRef}>
      <button
        type="button"
        className={open ? 'sel-trigger is-open' : 'sel-trigger'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="acc-av">{selected.initials}</span>
        <span className="acc-meta">
          <span className="acc-name">{selected.name}</span>
          <span className="acc-position">{selected.position}</span>
        </span>
        <span className="sel-chev">
          <Icon name="chevronDown" size={16} strokeWidth={2} />
        </span>
      </button>

      {open ? (
        <div className="sel-pop" role="listbox" aria-labelledby={labelId}>
          <p className="sel-group">Meja operasional</p>
          {OPERATIONAL_ACCOUNTS.map(option)}
          <p className="sel-group">Pemantauan</p>
          {OBSERVER_ACCOUNTS.map(option)}
        </div>
      ) : null}
    </div>
  )
}
