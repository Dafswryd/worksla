import type { Cluster, Pegawai, StatCluster, TitikHarian } from '@/types'

export const SEMUA_CLUSTER: readonly Cluster[] = ['HCRC', 'MedTech', 'Stem Cell', 'Drug Development']

/**
 * Daftar pegawai untuk papan beban kerja. `rata` dan `selesai30` adalah
 * ringkasan 30 hari terakhir yang nantinya datang dari backend; kolom
 * "di meja" dihitung langsung dari daftar pengajuan, bukan dari sini.
 */
export const PEGAWAI: readonly Pegawai[] = [
  { nama: 'Rina Kartika', peran: 'Pengaju', cluster: 'HCRC', rata: 0.9, selesai30: 7 },
  { nama: 'Andi Prasetyo', peran: 'Pengaju', cluster: 'MedTech', rata: 1.4, selesai30: 9 },
  { nama: 'Lestari Ayu', peran: 'Pengaju', cluster: 'Stem Cell', rata: 0.7, selesai30: 5 },
  { nama: 'Dimas Saputra', peran: 'Pengaju', cluster: 'Drug Development', rata: 1.1, selesai30: 6 },
  { nama: 'Sari Dewi', peran: 'Sekret Keuangan', cluster: 'Lintas cluster', rata: 0.8, selesai30: 18 },
  { nama: 'Budi Santoso', peran: 'Sekret Kepegawaian', cluster: 'Lintas cluster', rata: 1.2, selesai30: 11 },
  { nama: 'Tuti Marlina', peran: 'Sekret Umum', cluster: 'Lintas cluster', rata: 1.9, selesai30: 9 },
  { nama: 'Hendra Wijaya', peran: 'Wadir', cluster: 'Lintas cluster', rata: 2.4, selesai30: 31 },
  { nama: 'Ratna Puspita', peran: 'Direktur', cluster: 'Lintas cluster', rata: 2.8, selesai30: 29 },
]

export const STAT_CLUSTER: Readonly<Record<Cluster, StatCluster>> = {
  HCRC: { rata: 5.2, selesai30: 14, pegawai: 9 },
  MedTech: { rata: 6.8, selesai30: 11, pegawai: 12 },
  'Stem Cell': { rata: 4.6, selesai30: 8, pegawai: 7 },
  'Drug Development': { rata: 3.9, selesai30: 6, pegawai: 5 },
}

/** Pergerakan 14 hari terakhir: [tanggal, berkas masuk, berkas selesai]. */
export const HARIAN: readonly TitikHarian[] = [
  ['30/8', 3, 2],
  ['31/8', 2, 3],
  ['1/9', 4, 2],
  ['2/9', 5, 3],
  ['3/9', 3, 4],
  ['4/9', 6, 3],
  ['5/9', 2, 5],
  ['6/9', 1, 1],
  ['7/9', 0, 0],
  ['8/9', 5, 4],
  ['9/9', 6, 3],
  ['10/9', 7, 2],
  ['11/9', 4, 5],
  ['12/9', 3, 1],
]
