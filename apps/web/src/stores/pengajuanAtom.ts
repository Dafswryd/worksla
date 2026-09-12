import { useCallback } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import { tahapDari } from '@imeri/shared'
import { AWALAN_KODE, PENGAJUAN_SEED } from '@/constants/pengajuan'
import { JEJAK_MAJU } from '@/constants/tahapan'
import { peranDari } from '@/constants/peran'
import { waktuSekarang } from '@/helpers/format'
import { alurAtom } from './alurAtom'
import { peranAktifAtom } from './sesiAtom'
import { useToast } from './toastAtom'
import type { Kategori, Pengajuan } from '@/types'

export const pengajuanAtom = atom<readonly Pengajuan[]>(PENGAJUAN_SEED)

const ganti = (
  daftar: readonly Pengajuan[],
  kode: string,
  ubah: (pengajuan: Pengajuan) => Pengajuan,
): readonly Pengajuan[] => daftar.map((item) => (item.kode === kode ? ubah(item) : item))

/**
 * Semua aksi yang memindahkan berkas. Dikumpulkan di satu tempat supaya
 * aturan "mundur satu langkah" dan "checklist mengunci" tidak tersebar
 * di banyak komponen.
 */
export function useAlurAksi() {
  const [daftar, setDaftar] = useAtom(pengajuanAtom)
  const { tahapan, rute } = useAtomValue(alurAtom)
  const peran = useAtomValue(peranAktifAtom)
  const toast = useToast()

  /** Teruskan berkas ke meja berikutnya. */
  const majukan = useCallback(
    (kode: string) => {
      const kini = daftar.find((item) => item.kode === kode)
      if (!kini) return
      const tahap = tahapDari(tahapan, kini.tahap)
      const tahapBaru = kini.tahap + 1
      const selesai = tahapBaru >= tahapan.length - 1

      setDaftar((prev) =>
        ganti(prev, kode, (item) => ({
          ...item,
          tahap: tahapBaru,
          hari: selesai ? 0 : 1,
          status: selesai ? 'selesai' : 'berjalan',
          checklist: [],
          riwayat: [
            ...item.riwayat,
            {
              aktor: peran.nama,
              peran: peran.jab,
              aksi: JEJAK_MAJU[tahap.key] ?? 'meneruskan berkas',
              waktu: waktuSekarang(),
              jenis: 'ok',
            },
          ],
        })),
      )

      toast(
        selesai
          ? `${kode} selesai — pengaju sudah diberi tahu`
          : `${kode} diteruskan ke ${tahapDari(tahapan, tahapBaru).meja}`,
      )
    },
    [daftar, peran, setDaftar, tahapan, toast],
  )

  /** Kembalikan berkas satu langkah, dengan komentar yang jadi checklist. */
  const kembalikan = useCallback(
    (kode: string, komentar: string) => {
      const poin = komentar
        .split('\n')
        .map((baris) => baris.trim())
        .filter((baris) => baris !== '')
      if (poin.length === 0) {
        toast('Alasan pengembalian wajib diisi', 'error')
        return
      }
      const kini = daftar.find((item) => item.kode === kode)
      if (!kini) return
      const tujuan = tahapDari(tahapan, kini.tahap - 1)

      setDaftar((prev) =>
        ganti(prev, kode, (item) => ({
          ...item,
          tahap: Math.max(0, item.tahap - 1),
          hari: 1,
          status: 'dikembalikan',
          checklist: poin.map((teks) => ({ teks, done: false })),
          riwayat: [
            ...item.riwayat,
            {
              aktor: peran.nama,
              peran: peran.jab,
              aksi: `mengembalikan ke ${tujuan.meja}`,
              waktu: waktuSekarang(),
              jenis: 'no',
              komentar: `${poin.join('. ')}.`,
            },
          ],
        })),
      )

      toast(`${kode} dikembalikan ke ${tujuan.meja} dengan ${poin.length} poin checklist`)
    },
    [daftar, peran, setDaftar, tahapan, toast],
  )

  /** Centang atau lepas satu poin checklist revisi. */
  const toggleChecklist = useCallback(
    (kode: string, indeks: number) => {
      setDaftar((prev) =>
        ganti(prev, kode, (item) => ({
          ...item,
          checklist: item.checklist.map((poin, i) => (i === indeks ? { ...poin, done: !poin.done } : poin)),
        })),
      )
    },
    [setDaftar],
  )

  /** Pengajuan baru dari pengaju; langsung masuk ke sekret kategorinya. */
  const buat = useCallback(
    (judul: string, kategori: Kategori) => {
      const kode = `${AWALAN_KODE[kategori]}-2609-0${40 + daftar.length}`
      const waktu = waktuSekarang()
      const baru: Pengajuan = {
        kode,
        judul: judul.trim() === '' ? 'Pengajuan tanpa judul' : judul.trim(),
        pemohon: peran.nama,
        pemohonId: peran.id,
        cluster: 'HCRC',
        kategori,
        dibuat: '12 Sep 2026',
        tahap: 1,
        hari: 1,
        status: 'berjalan',
        lampiran: [
          { nama: 'Foto kondisi ruang arsip.pdf', tipe: 'pdf', ukuran: '820 KB' },
          { nama: 'Estimasi harga rak.xlsx', tipe: 'xls', ukuran: '44 KB' },
        ],
        checklist: [],
        riwayat: [{ aktor: peran.nama, peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu, jenis: 'up' }],
      }

      setDaftar((prev) => [baru, ...prev])
      toast(`${kode} terkirim ke ${peranDari(rute[kategori]).nama}`)
      return kode
    },
    [daftar.length, peran, rute, setDaftar, toast],
  )

  return { majukan, kembalikan, toggleChecklist, buat }
}
