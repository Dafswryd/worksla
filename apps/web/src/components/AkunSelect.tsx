import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { AKUN_OPERASIONAL, AKUN_PEMANTAUAN, peranDari } from '@/constants/peran'

interface AkunSelectProps {
  readonly nilai: string
  readonly onPilih: (peranId: string) => void
  readonly labelId: string
}

/**
 * Pemilih akun. Bukan <select> bawaan karena tiap opsi perlu membawa
 * avatar, jabatan, dan penanda terpilih.
 */
export function AkunSelect({ nilai, onPilih, labelId }: AkunSelectProps) {
  const [terbuka, setTerbuka] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const terpilih = peranDari(nilai)

  useEffect(() => {
    if (!terbuka) return
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setTerbuka(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTerbuka(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [terbuka])

  const opsi = (id: string) => {
    const peran = peranDari(id)
    const aktif = peran.id === nilai
    return (
      <button
        type="button"
        key={peran.id}
        className={aktif ? 'sel-opt is-on' : 'sel-opt'}
        role="option"
        aria-selected={aktif}
        onClick={() => {
          onPilih(peran.id)
          setTerbuka(false)
        }}
      >
        <span className="acc-av">{peran.ini}</span>
        <span className="acc-meta">
          <span className="acc-name">{peran.nama}</span>
          <span className="acc-jab">{peran.jab}</span>
        </span>
        {aktif ? (
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
        className={terbuka ? 'sel-trigger is-open' : 'sel-trigger'}
        aria-haspopup="listbox"
        aria-expanded={terbuka}
        aria-labelledby={labelId}
        onClick={() => setTerbuka((prev) => !prev)}
      >
        <span className="acc-av">{terpilih.ini}</span>
        <span className="acc-meta">
          <span className="acc-name">{terpilih.nama}</span>
          <span className="acc-jab">{terpilih.jab}</span>
        </span>
        <span className="sel-chev">
          <Icon name="chevronDown" size={16} strokeWidth={2} />
        </span>
      </button>

      {terbuka ? (
        <div className="sel-pop" role="listbox" aria-labelledby={labelId}>
          <p className="sel-group">Meja operasional</p>
          {AKUN_OPERASIONAL.map(opsi)}
          <p className="sel-group">Pemantauan</p>
          {AKUN_PEMANTAUAN.map(opsi)}
        </div>
      ) : null}
    </div>
  )
}
