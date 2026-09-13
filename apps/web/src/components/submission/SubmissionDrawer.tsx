import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { bolehDiteruskan, checklistBeres, lewatSla, memegang, tahapDari } from '@imeri/shared'
import { Chip, StatusChip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { peranDari } from '@/constants/peran'
import { LABEL_MAJU, LABEL_TOLAK } from '@/constants/tahapan'
import { pemegang } from '@/helpers/pemantauan'
import { alurAtom } from '@/stores/alurAtom'
import { useAlurAksi } from '@/stores/pengajuanAtom'
import { peranAktifAtom } from '@/stores/sesiAtom'
import { useToast } from '@/stores/toastAtom'
import { TolakModal } from './TolakModal'
import type { Pengajuan, Tahap } from '@/types'

interface PengajuanDrawerProps {
  readonly pengajuan: Pengajuan
  readonly onTutup: () => void
}

/** Garis waktu posisi berkas — satu baris per tahap. */
function PosisiBerkas({ pengajuan, tahapan }: { readonly pengajuan: Pengajuan; readonly tahapan: readonly Tahap[] }) {
  const telat = lewatSla(pengajuan, tahapan)

  return (
    <ul className="vtl">
      {tahapan.map((tahap, indeks) => {
        const lewat = pengajuan.status === 'selesai' || indeks < pengajuan.tahap
        const kini = indeks === pengajuan.tahap && pengajuan.status !== 'selesai'
        const kelas = lewat
          ? 'done'
          : kini
            ? pengajuan.status === 'dikembalikan'
              ? 'back'
              : telat
                ? 'late'
                : 'now'
            : ''

        const keterangan = lewat
          ? 'selesai'
          : kini
            ? pengajuan.status === 'dikembalikan'
              ? 'dikembalikan ke sini — menunggu perbaikan'
              : tahap.sla === null
                ? 'menunggu pengaju'
                : `hari ke-${pengajuan.hari} dari batas ${tahap.sla} hari${telat ? ' — lewat batas' : ''}`
            : 'belum mulai'

        return (
          <li className={kelas} key={`${tahap.key}-${indeks}`}>
            <span className="vtl-dot">
              {lewat ? (
                <Icon name="check" size={12} strokeWidth={2.4} />
              ) : kini ? (
                <Icon name={pengajuan.status === 'dikembalikan' ? 'rotateBack' : 'clock'} size={12} strokeWidth={2.2} />
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
              )}
            </span>
            <span className="vtl-body">
              <span className="vtl-who">{tahap.meja}</span>
              <span className="vtl-what">{tahap.aksi}</span>
              <span className="vtl-when">{keterangan}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function PengajuanDrawer({ pengajuan, onTutup }: PengajuanDrawerProps) {
  const { tahapan, rute } = useAtomValue(alurAtom)
  const peran = useAtomValue(peranAktifAtom)
  const { majukan, kembalikan, toggleChecklist } = useAlurAksi()
  const toast = useToast()
  const [tolakTerbuka, setTolakTerbuka] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !tolakTerbuka) onTutup()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onTutup, tolakTerbuka])

  const pegang = memegang(pengajuan, peran, tahapan)
  const siapa = pemegang(pengajuan, tahapan, rute)
  const tahap = tahapDari(tahapan, pengajuan.tahap)
  const labelMaju = LABEL_MAJU[tahap.key]
  const labelTolak = LABEL_TOLAK[tahap.key]
  const terkunci = !bolehDiteruskan(pengajuan)

  return (
    <>
      <div className="task-backdrop" role="presentation" onClick={onTutup} />
      <aside className="task-drawer" role="dialog" aria-label={`Detail ${pengajuan.kode}`}>
        <div className="task-drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="p-kode num" style={{ marginBottom: 4 }}>
              {pengajuan.kode}
            </div>
            <div className="task-drawer-title">{pengajuan.judul}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              <StatusChip pengajuan={pengajuan} tahapan={tahapan} />
              <Chip tone="purple">{pengajuan.kategori}</Chip>
              <Chip>Cluster {pengajuan.cluster}</Chip>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onTutup}>
            <Icon name="close" size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="task-drawer-body">
          <p className="task-drawer-label">Bola ada di</p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 12px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface-2)',
            }}
          >
            <span className="avatar" style={{ width: 30, height: 30, fontSize: 'var(--fs-xs)' }}>
              {siapa.ini}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{siapa.nama}</div>
              <div className="user-plan">{siapa.jab}</div>
            </div>
            {pegang ? (
              <span style={{ marginLeft: 'auto' }}>
                <Chip tone="blue">Anda</Chip>
              </span>
            ) : null}
          </div>

          <p className="task-drawer-label">Ringkasan</p>
          <dl className="kv">
            <dt>Pemohon</dt>
            <dd>{pengajuan.pemohon}</dd>
            <dt>Dibuat</dt>
            <dd className="num">{pengajuan.dibuat}</dd>
            <dt>Kategori</dt>
            <dd>{pengajuan.kategori}</dd>
            <dt>Sekret tujuan</dt>
            <dd>{peranDari(rute[pengajuan.kategori]).nama}</dd>
          </dl>

          <p className="task-drawer-label">Posisi berkas</p>
          <PosisiBerkas pengajuan={pengajuan} tahapan={tahapan} />

          <p className="task-drawer-label">Lampiran ({pengajuan.lampiran.length})</p>
          <div className="att">
            {pengajuan.lampiran.map((berkas) => (
              <div className="att-row" key={berkas.nama}>
                <span className={`att-ico ${berkas.tipe}`}>
                  <Icon name="file" size={15} />
                </span>
                <span className="att-meta">
                  <span className="att-name">{berkas.nama}</span>
                  <span className="att-sub num">{berkas.ukuran} · v1</span>
                </span>
                <button
                  type="button"
                  className="row-btn"
                  onClick={() => toast('Pratinjau lampiran belum tersedia di prototipe ini', 'info')}
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>

          {pengajuan.checklist.length > 0 ? (
            <>
              <p className="task-drawer-label">Checklist revisi</p>
              <ul className="ck">
                {pengajuan.checklist.map((poin, indeks) => (
                  <li className={poin.done ? 'done' : undefined} key={poin.teks}>
                    <button
                      type="button"
                      disabled={!pegang}
                      style={pegang ? undefined : { cursor: 'default' }}
                      onClick={() => toggleChecklist(pengajuan.kode, indeks)}
                    >
                      <span className="ck-box">
                        <Icon name="check" size={11} strokeWidth={3} />
                      </span>
                      <span>{poin.teks}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="ck-gate">
                <Icon name="alert" size={13} strokeWidth={2} />
                {checklistBeres(pengajuan)
                  ? 'Semua poin tertutup — berkas boleh diajukan ulang.'
                  : `${pengajuan.checklist.filter((poin) => !poin.done).length} poin belum tertutup. Berkas belum bisa diteruskan.`}
              </p>
            </>
          ) : null}

          <p className="task-drawer-label">Riwayat</p>
          <div className="hist">
            {[...pengajuan.riwayat].reverse().map((jejak, indeks) => (
              <div className="hist-row" key={`${jejak.waktu}-${indeks}`}>
                <span className={`hist-ico ${jejak.jenis}`}>
                  <Icon
                    name={jejak.jenis === 'no' ? 'rotateBack' : jejak.jenis === 'up' ? 'clip' : 'check'}
                    size={14}
                    strokeWidth={2}
                  />
                </span>
                <span className="hist-body">
                  <span className="hist-text">
                    <b>{jejak.aktor}</b> ({jejak.peran}) {jejak.aksi}
                  </span>
                  <span className="hist-time num">{jejak.waktu}</span>
                  {jejak.komentar ? <p className="hist-quote">{jejak.komentar}</p> : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        {pengajuan.status === 'selesai' ? (
          <div className="drawer-note">
            <Icon name="check" size={15} strokeWidth={2} />
            Sudah disetujui dan diarsipkan. Berkas final bisa diunduh dari daftar lampiran.
          </div>
        ) : !pegang ? (
          <div className="drawer-note">
            <Icon name="clock" size={15} strokeWidth={2} />
            Berkas ada di {siapa.nama}. Anda bisa memantau, belum bisa mengambil tindakan.
          </div>
        ) : (
          <div className="drawer-foot">
            {labelTolak ? (
              <button type="button" className="btn btn-danger" onClick={() => setTolakTerbuka(true)}>
                <Icon name="rotateBack" size={16} strokeWidth={2} /> {labelTolak}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              disabled={terkunci}
              title={terkunci ? 'Tutup dulu semua poin checklist' : undefined}
              onClick={() => majukan(pengajuan.kode)}
            >
              <Icon name="arrowRight" size={16} strokeWidth={2} /> {labelMaju ?? 'Teruskan'}
            </button>
          </div>
        )}
      </aside>

      {tolakTerbuka ? (
        <TolakModal
          pengajuan={pengajuan}
          onBatal={() => setTolakTerbuka(false)}
          onKirim={(komentar) => {
            kembalikan(pengajuan.kode, komentar)
            setTolakTerbuka(false)
          }}
        />
      ) : null}
    </>
  )
}
