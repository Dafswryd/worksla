import { Navigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { pemantau, terlihat } from '@imeri/shared'
import { bebanKerja } from '@/helpers/pemantauan'
import { alurAtom } from '@/stores/alurAtom'
import { pengajuanAtom } from '@/stores/pengajuanAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { TabelBeban } from '@/pages/Pemantauan/components/TabelBeban'

/** Papan beban kerja versi penuh — semua kolom, semua pegawai dalam lingkup. */
export default function BebanKerja() {
  const peran = useAtomValue(peranAktifAtom)
  const daftar = useAtomValue(pengajuanAtom)
  const { tahapan, rute } = useAtomValue(alurAtom)

  if (!pemantau(peran)) return <Navigate to="/" replace />

  const lingkup = daftar.filter((item) => terlihat(item, peran))

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Beban kerja</h1>
          <p className="page-sub">
            {peran.tipe === 'admin'
              ? 'Siapa memegang berapa berkas saat ini, dan berapa di antaranya sudah lewat batas.'
              : `Pegawai Cluster ${peran.cluster} beserta meja yang memproses berkas mereka.`}
          </p>
        </div>
      </div>

      <div className="card">
        <TabelBeban baris={bebanKerja(lingkup, tahapan, rute, peran)} penuh />
      </div>
    </div>
  )
}
