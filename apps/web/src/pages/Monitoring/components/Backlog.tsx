import { Icon } from '@/components/Icon'
import type { BarisPenumpukan } from '@/helpers/pemantauan'

/**
 * Berapa berkas menumpuk di tiap meja. Panjang batang relatif terhadap meja
 * terpadat; porsi kuning adalah berkas yang sudah lewat batas waktunya.
 */
export function Penumpukan({ baris }: { readonly baris: readonly BarisPenumpukan[] }) {
  const puncak = Math.max(1, ...baris.map((item) => item.jumlah))

  return (
    <>
      <div className="bn-list">
        {baris.map((item) => (
          <div className="bn-row" key={`${item.tahap.key}-${item.indeks}`}>
            <span className="bn-name">
              {item.tahap.meja}
              <small>{item.tahap.aksi}</small>
            </span>
            <span
              className="bn-bar"
              role="img"
              aria-label={`${item.jumlah} berkas, ${item.telat} lewat batas`}
            >
              <i className="ok" style={{ width: `${((item.jumlah - item.telat) / puncak) * 100}%` }} />
              <i className="late" style={{ width: `${(item.telat / puncak) * 100}%` }} />
            </span>
            <span className="bn-val num">
              {item.jumlah}
              <small>{item.tahap.sla === null ? 'tanpa batas' : `batas ${item.tahap.sla} hari`}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="card-foot">
        <Icon name="alert" size={13} strokeWidth={2} />
        Batang kuning = berkas yang sudah lewat batas waktu tahapnya.
      </div>
    </>
  )
}
