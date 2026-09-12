import { Navigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { lewatSla, memegang, pemantau } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { StatStrip } from '@/components/StatStrip'
import { BuatModal } from '@/components/pengajuan/BuatModal'
import { FilterBar } from '@/components/pengajuan/FilterBar'
import { PengajuanDrawer } from '@/components/pengajuan/PengajuanDrawer'
import { PengajuanTable } from '@/components/pengajuan/PengajuanTable'
import { saringDaftar } from '@/helpers/saring'
import { alurAtom } from '@/stores/alurAtom'
import { pengajuanAtom, useAlurAksi } from '@/stores/pengajuanAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { berkasTerbukaAtom, cariAtom, saringAtom } from '@/stores/uiAtom'
import { JUDUL_TAB, buatTerbukaAtom, tabAtom } from './atoms'
import { TabBar } from './components/TabBar'
import type { Peran } from '@/types'

function subJudul(peran: Peran): string {
  if (peran.tipe === 'pengaju') return 'Pengajuan yang Anda buat, lengkap dengan posisi berkasnya saat ini.'
  if (peran.tipe === 'sekret') return `Hanya pengajuan kategori ${peran.kategori} yang masuk ke meja Anda.`
  if (peran.tipe === 'wadir') return 'Semua kategori melewati meja Anda untuk QC dan paraf.'
  return 'Berkas yang sudah diparaf Wadir dan menunggu tanda tangan Anda.'
}

export default function KotakMasuk() {
  const peran = useAtomValue(peranAktifAtom)
  const daftar = useAtomValue(pengajuanAtom)
  const { tahapan } = useAtomValue(alurAtom)
  const saring = useAtomValue(saringAtom)
  const cari = useAtomValue(cariAtom)
  const [tab, setTab] = useAtom(tabAtom)
  const [terbuka, setTerbuka] = useAtom(berkasTerbukaAtom)
  const [buatTerbuka, setBuatTerbuka] = useAtom(buatTerbukaAtom)
  const { buat } = useAlurAksi()

  // Peran pemantau tidak punya kotak masuk — mereka mulai dari papan ringkasan.
  if (pemantau(peran)) return <Navigate to="/pemantauan" replace />

  const lingkup = saringDaftar(daftar, peran, saring, cari)
  const perluSaya = lingkup.filter((item) => memegang(item, peran, tahapan))
  const berjalan = lingkup.filter((item) => item.status === 'berjalan')
  const telat = lingkup.filter((item) => lewatSla(item, tahapan))
  const selesai = lingkup.filter((item) => item.status === 'selesai')
  const dikembalikan = lingkup.filter((item) => item.status === 'dikembalikan')

  const tampil =
    tab === 'tindakan'
      ? perluSaya
      : tab === 'jalan'
        ? berjalan.filter((item) => !memegang(item, peran, tahapan))
        : tab === 'balik'
          ? dikembalikan
          : selesai

  const dibuka = terbuka === null ? undefined : daftar.find((item) => item.kode === terbuka)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Kotak masuk</h1>
          <p className="page-sub">{subJudul(peran)}</p>
        </div>
        <div className="page-actions">
          {peran.tipe === 'pengaju' ? (
            <button type="button" className="btn btn-primary" onClick={() => setBuatTerbuka(true)}>
              <Icon name="plus" size={16} strokeWidth={2} /> Buat pengajuan
            </button>
          ) : null}
        </div>
      </div>

      <StatStrip
        items={[
          {
            label: 'Perlu tindakan saya',
            ikon: 'inbox',
            nilai: perluSaya.length,
            keterangan: perluSaya.length > 0 ? 'bola ada di meja Anda' : 'meja Anda kosong',
          },
          { label: 'Sedang berjalan', ikon: 'arrowRight', nilai: berjalan.length, keterangan: 'di seluruh tahap' },
          {
            label: 'Lewat SLA',
            ikon: 'clock',
            nilai: (
              <>
                {telat.length}
                {telat.length > 0 ? <Chip tone="amber">perlu ditagih</Chip> : null}
              </>
            ),
            keterangan: telat.length > 0 ? 'melebihi batas waktu tahap' : 'semua dalam batas waktu',
          },
          { label: 'Selesai', ikon: 'check', nilai: selesai.length, keterangan: 'tersimpan di arsip' },
        ]}
      />

      <TabBar
        aktif={tab}
        onPilih={setTab}
        jumlah={{
          tindakan: perluSaya.length,
          jalan: berjalan.length - perluSaya.length > 0 ? berjalan.length - perluSaya.length : 0,
          balik: dikembalikan.length,
          selesai: selesai.length,
        }}
      />

      <FilterBar peran={peran} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">{JUDUL_TAB[tab]}</span>
          <Chip tone="slate" angka>
            {tampil.length} berkas
          </Chip>
        </div>
        <PengajuanTable daftar={tampil} kodeAktif={terbuka} onBuka={(kode) => setTerbuka(kode)} />
      </div>

      {dibuka ? <PengajuanDrawer pengajuan={dibuka} onTutup={() => setTerbuka(null)} /> : null}

      {buatTerbuka ? (
        <BuatModal
          onBatal={() => setBuatTerbuka(false)}
          onKirim={(judul, kategori) => {
            buat(judul, kategori)
            setBuatTerbuka(false)
            setTab('jalan')
          }}
        />
      ) : null}
    </div>
  )
}
