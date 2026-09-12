import { useAtom, useAtomValue } from 'jotai'
import { pemantau } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { FilterBar } from '@/components/pengajuan/FilterBar'
import { PengajuanDrawer } from '@/components/pengajuan/PengajuanDrawer'
import { PengajuanTable } from '@/components/pengajuan/PengajuanTable'
import { saringDaftar } from '@/helpers/saring'
import { pengajuanAtom } from '@/stores/pengajuanAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { berkasTerbukaAtom, cariAtom, saringAtom } from '@/stores/uiAtom'

/** Seluruh berkas dalam lingkup peran — tanpa tab, hanya saringan. */
export default function Berkas() {
  const peran = useAtomValue(peranAktifAtom)
  const daftar = useAtomValue(pengajuanAtom)
  const saring = useAtomValue(saringAtom)
  const cari = useAtomValue(cariAtom)
  const [terbuka, setTerbuka] = useAtom(berkasTerbukaAtom)

  const tampil = saringDaftar(daftar, peran, saring, cari)
  const dibuka = terbuka === null ? undefined : daftar.find((item) => item.kode === terbuka)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">{peran.tipe === 'monitor' ? `Berkas Cluster ${peran.cluster}` : 'Semua berkas'}</h1>
          <p className="page-sub">
            {pemantau(peran)
              ? 'Hanya membaca — Anda bisa membuka detail, tidak bisa memberi paraf.'
              : 'Berkas yang boleh Anda lihat, termasuk yang sedang di meja orang lain.'}
          </p>
        </div>
      </div>

      <FilterBar peran={peran} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">Seluruh berkas dalam lingkup Anda</span>
          <Chip tone="slate" angka>
            {tampil.length} berkas
          </Chip>
        </div>
        <PengajuanTable
          daftar={tampil}
          kodeAktif={terbuka}
          onBuka={(kode) => setTerbuka(kode)}
          kosong="Tidak ada berkas yang cocok."
        />
      </div>

      {dibuka ? <PengajuanDrawer pengajuan={dibuka} onTutup={() => setTerbuka(null)} /> : null}
    </div>
  )
}
