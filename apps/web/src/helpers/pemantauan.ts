import { lewatSla, tahapDari } from '@imeri/shared'
import { peranDari } from '@/constants/peran'
import { PEGAWAI } from '@/constants/pegawai'
import { inisial, persen } from './format'
import type { Pegawai, Pengajuan, Peran, RuteKategori, Tahap } from '@/types'

export interface Pemegang {
  readonly nama: string
  readonly ini: string
  readonly jab: string
}

/** Siapa yang memegang berkas ini sekarang. */
export function pemegang(pengajuan: Pengajuan, tahapan: readonly Tahap[], rute: RuteKategori): Pemegang {
  if (pengajuan.status === 'selesai') return { nama: '—', ini: '✓', jab: 'Arsip' }

  const tahap = tahapDari(tahapan, pengajuan.tahap)
  if (tahap.key === 'pengaju') {
    return { nama: pengajuan.pemohon, ini: inisial(pengajuan.pemohon), jab: 'menunggu perbaikan' }
  }
  if (tahap.key === 'sekret' || tahap.key === 'rekam') {
    const sekret = peranDari(rute[pengajuan.kategori])
    return { nama: sekret.nama, ini: sekret.ini, jab: sekret.jab }
  }
  if (tahap.key === 'wadir') {
    const wadir = peranDari('hendra')
    return { nama: wadir.nama, ini: wadir.ini, jab: 'QC & paraf' }
  }
  const direktur = peranDari('ratna')
  return { nama: direktur.nama, ini: direktur.ini, jab: 'Persetujuan' }
}

export interface RingkasanPantau {
  readonly aktif: readonly Pengajuan[]
  readonly telat: readonly Pengajuan[]
  readonly dikembalikan: readonly Pengajuan[]
  readonly selesai: readonly Pengajuan[]
  readonly rasioTelat: number
  readonly rasioBalik: number
}

/** Angka-angka kepala papan pemantauan. */
export function ringkasan(daftar: readonly Pengajuan[], tahapan: readonly Tahap[]): RingkasanPantau {
  const aktif = daftar.filter((item) => item.status !== 'selesai')
  const telat = aktif.filter((item) => lewatSla(item, tahapan))
  return {
    aktif,
    telat,
    dikembalikan: daftar.filter((item) => item.status === 'dikembalikan'),
    selesai: daftar.filter((item) => item.status === 'selesai'),
    rasioTelat: persen(telat.length, aktif.length),
    rasioBalik: persen(daftar.filter((item) => item.status === 'dikembalikan').length, daftar.length),
  }
}

export interface BarisPenumpukan {
  readonly tahap: Tahap
  readonly indeks: number
  readonly jumlah: number
  readonly telat: number
}

/** Berapa berkas menumpuk di tiap meja, dan berapa di antaranya lewat batas. */
export function penumpukan(aktif: readonly Pengajuan[], tahapan: readonly Tahap[]): readonly BarisPenumpukan[] {
  return tahapan.slice(0, tahapan.length - 1).map((tahap, indeks) => {
    const di = aktif.filter((item) => item.tahap === indeks)
    return { tahap, indeks, jumlah: di.length, telat: di.filter((item) => lewatSla(item, tahapan)).length }
  })
}

export interface BarisBeban {
  readonly pegawai: Pegawai
  readonly jumlah: number
  readonly telat: number
}

/**
 * Beban tiap pegawai. Kolom "di meja" dihitung langsung dari daftar berkas,
 * bukan angka tersimpan — jadi selalu cocok dengan papan penumpukan.
 */
export function bebanKerja(
  daftar: readonly Pengajuan[],
  tahapan: readonly Tahap[],
  rute: RuteKategori,
  peran: Peran,
): readonly BarisBeban[] {
  const orang =
    peran.tipe === 'monitor'
      ? PEGAWAI.filter((item) => item.peran !== 'Pengaju' || item.cluster === peran.cluster)
      : PEGAWAI

  return orang.map((pegawai) => {
    const dipegang = daftar.filter(
      (item) => item.status !== 'selesai' && pemegang(item, tahapan, rute).nama === pegawai.nama,
    )
    return {
      pegawai,
      jumlah: dipegang.length,
      telat: dipegang.filter((item) => lewatSla(item, tahapan)).length,
    }
  })
}
