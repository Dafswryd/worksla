import type { Kategori, Pengajuan, Peran, RuteKategori, Tahap } from './types'

/**
 * Aturan alur — sengaja murni (tanpa React, tanpa state global) supaya bisa
 * dipakai ulang oleh backend saat validasi sisi server dibangun.
 */

/** Ambil tahap pada indeks tertentu, dijepit ke rentang yang valid. */
export function tahapDari(tahapan: readonly Tahap[], indeks: number): Tahap {
  const aman = Math.min(Math.max(indeks, 0), tahapan.length - 1)
  const tahap = tahapan[aman]
  if (!tahap) throw new Error('Daftar tahap kosong')
  return tahap
}

/** Peran yang hanya membaca: super admin dan monitor cluster. */
export const pemantau = (peran: Peran): boolean => peran.tipe === 'admin' || peran.tipe === 'monitor'

/** Apakah berkas ini masuk lingkup peran tersebut. */
export function terlihat(pengajuan: Pengajuan, peran: Peran): boolean {
  if (peran.tipe === 'pengaju') return pengajuan.pemohonId === peran.id
  if (peran.tipe === 'sekret') return pengajuan.kategori === peran.kategori
  if (peran.tipe === 'monitor') return pengajuan.cluster === peran.cluster
  return true
}

/** Apakah bola ada di tangan peran tersebut sekarang. */
export function memegang(pengajuan: Pengajuan, peran: Peran, tahapan: readonly Tahap[]): boolean {
  if (pengajuan.status === 'selesai') return false
  const tahap = tahapDari(tahapan, pengajuan.tahap)
  if (tahap.key === 'pengaju') return peran.tipe === 'pengaju' && pengajuan.pemohonId === peran.id
  if (tahap.key === 'sekret' || tahap.key === 'rekam') {
    return peran.tipe === 'sekret' && pengajuan.kategori === peran.kategori
  }
  if (tahap.key === 'wadir') return peran.tipe === 'wadir'
  if (tahap.key === 'direktur') return peran.tipe === 'direktur'
  return false
}

/** Berkas melewati batas waktu tahapnya. */
export function lewatSla(pengajuan: Pengajuan, tahapan: readonly Tahap[]): boolean {
  if (pengajuan.status === 'selesai') return false
  const { sla } = tahapDari(tahapan, pengajuan.tahap)
  return sla !== null && pengajuan.hari > sla
}

/** Berapa hari melewati batas; 0 kalau masih dalam batas. */
export function selisihSla(pengajuan: Pengajuan, tahapan: readonly Tahap[]): number {
  const { sla } = tahapDari(tahapan, pengajuan.tahap)
  if (sla === null || pengajuan.status === 'selesai') return 0
  return Math.max(0, pengajuan.hari - sla)
}

/** Sekret yang menangani satu kategori, menurut rute yang berlaku. */
export const sekretUntuk = (rute: RuteKategori, kategori: Kategori): string => rute[kategori]

/** Checklist revisi sudah tertutup semua (atau memang tidak ada). */
export const checklistBeres = (pengajuan: Pengajuan): boolean =>
  pengajuan.checklist.length === 0 || pengajuan.checklist.every((item) => item.done)

/** Berkas yang dikembalikan tidak boleh diteruskan sebelum checklist tertutup. */
export const bolehDiteruskan = (pengajuan: Pengajuan): boolean =>
  pengajuan.status !== 'dikembalikan' || checklistBeres(pengajuan)
