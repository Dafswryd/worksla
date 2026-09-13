import { Navigate, useNavigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { pemantau, terlihat } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { StatStrip } from '@/components/StatStrip'
import { PengajuanDrawer } from '@/components/pengajuan/PengajuanDrawer'
import { STAT_CLUSTER } from '@/constants/pegawai'
import { bebanKerja, penumpukan, ringkasan } from '@/helpers/pemantauan'
import { alurAtom } from '@/stores/alurAtom'
import { pengajuanAtom } from '@/stores/pengajuanAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { berkasTerbukaAtom } from '@/stores/uiAtom'
import { AntarCluster } from './components/AntarCluster'
import { LingkupBar } from './components/LingkupBar'
import { Penumpukan } from './components/Penumpukan'
import { Pergerakan } from './components/Pergerakan'
import { PerluDitagih } from './components/PerluDitagih'
import { TabelBeban } from './components/TabelBeban'

/** Rata-rata hari selesai: satu cluster untuk monitor, rata-rata empat untuk admin. */
function rataSelesai(cluster: string | undefined): number {
  const semua = Object.values(STAT_CLUSTER)
  if (cluster === undefined) return semua.reduce((jumlah, item) => jumlah + item.rata, 0) / semua.length
  return STAT_CLUSTER[cluster as keyof typeof STAT_CLUSTER]?.rata ?? 0
}

export default function Pemantauan() {
  const peran = useAtomValue(peranAktifAtom)
  const daftar = useAtomValue(pengajuanAtom)
  const { tahapan, rute } = useAtomValue(alurAtom)
  const [terbuka, setTerbuka] = useAtom(berkasTerbukaAtom)
  const navigate = useNavigate()

  // Papan ini hanya untuk Super Admin dan Monitor Cluster.
  if (!pemantau(peran)) return <Navigate to="/" replace />

  const lingkup = daftar.filter((item) => terlihat(item, peran))
  const m = ringkasan(lingkup, tahapan)
  const rata = rataSelesai(peran.tipe === 'monitor' ? peran.cluster : undefined)
  const dibuka = terbuka === null ? undefined : daftar.find((item) => item.kode === terbuka)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {peran.tipe === 'admin' ? 'Ringkasan seluruh instansi' : `Cluster ${peran.cluster}`}
          </h1>
          <p className="page-sub">
            {peran.tipe === 'admin'
              ? 'Pergerakan berkas, penumpukan per meja, dan beban kerja di semua cluster.'
              : `Pergerakan berkas dan beban kerja pegawai di Cluster ${peran.cluster}. Hanya berkas cluster ini yang terlihat.`}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/berkas')}>
            <Icon name="file" size={16} strokeWidth={2} /> Lihat daftar berkas
          </button>
        </div>
      </div>

      <LingkupBar peran={peran} jumlahBerkas={lingkup.length} />

      <StatStrip
        items={[
          {
            label: 'Berkas aktif',
            ikon: 'file',
            nilai: m.aktif.length,
            keterangan: 'sedang berjalan di semua tahap',
          },
          {
            label: 'Lewat SLA',
            ikon: 'clock',
            nilai: (
              <>
                {m.telat.length}
                {m.telat.length > 0 ? <Chip tone="amber">{m.rasioTelat}%</Chip> : null}
              </>
            ),
            keterangan: m.telat.length > 0 ? 'menunggu ditagih' : 'semua dalam batas',
          },
          {
            label: 'Tingkat pengembalian',
            ikon: 'rotateBack',
            nilai: `${m.rasioBalik}%`,
            keterangan: `${m.dikembalikan.length} berkas dikembalikan ke meja sebelumnya`,
          },
          {
            label: 'Rata-rata selesai',
            ikon: 'check',
            nilai: (
              <>
                {rata.toFixed(1)}
                <Chip tone="slate">hari</Chip>
              </>
            ),
            keterangan: 'dari kirim sampai arsip',
          },
        ]}
      />

      <div className="mgrid">
        <div className="m8">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Berkas menumpuk di meja mana</span>
              <Chip tone="slate" angka>
                {m.aktif.length} aktif
              </Chip>
            </div>
            <Penumpukan baris={penumpukan(m.aktif, tahapan)} />
          </div>
        </div>

        <div className="m4">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Pergerakan 14 hari</span>
            </div>
            <Pergerakan />
          </div>
        </div>

        <div className="m8">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Beban kerja pegawai</span>
              <button type="button" className="link-btn" onClick={() => navigate('/beban')}>
                Lihat semua <Icon name="arrowRight" size={14} strokeWidth={2} />
              </button>
            </div>
            <TabelBeban baris={bebanKerja(lingkup, tahapan, rute, peran)} penuh={false} />
          </div>
        </div>

        <div className="m4">
          <div className="card">
            <div className="card-head">
              <span className="card-title">Perlu ditagih</span>
              {m.telat.length > 0 ? (
                <Chip tone="amber" angka>
                  {m.telat.length}
                </Chip>
              ) : null}
            </div>
            <PerluDitagih daftar={m.telat} onBuka={(kode) => setTerbuka(kode)} />
          </div>
        </div>

        {peran.tipe === 'admin' ? (
          <div className="m12">
            <AntarCluster daftar={daftar} />
          </div>
        ) : null}
      </div>

      {dibuka ? <PengajuanDrawer pengajuan={dibuka} onTutup={() => setTerbuka(null)} /> : null}
    </div>
  )
}
