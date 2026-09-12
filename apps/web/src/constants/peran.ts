import type { Kategori, Peran, RuteKategori } from '@/types'

/** Akun yang tersedia di prototipe — enam meja operasional, tiga pemantau. */
export const PERAN: Readonly<Record<string, Peran>> = {
  rina: { id: 'rina', nama: 'Rina Kartika', tipe: 'pengaju', jab: 'Pengaju · Cluster HCRC', ini: 'RK' },
  sari: { id: 'sari', nama: 'Sari Dewi', tipe: 'sekret', kategori: 'Keuangan', jab: 'Sekret Keuangan', ini: 'SD' },
  budi: {
    id: 'budi',
    nama: 'Budi Santoso',
    tipe: 'sekret',
    kategori: 'Kepegawaian',
    jab: 'Sekret Kepegawaian',
    ini: 'BS',
  },
  tuti: { id: 'tuti', nama: 'Tuti Marlina', tipe: 'sekret', kategori: 'Umum', jab: 'Sekret Umum', ini: 'TM' },
  hendra: { id: 'hendra', nama: 'Hendra Wijaya', tipe: 'wadir', jab: 'Wakil Direktur', ini: 'HW' },
  ratna: { id: 'ratna', nama: 'Ratna Puspita', tipe: 'direktur', jab: 'Direktur', ini: 'RP' },
  yoga: { id: 'yoga', nama: 'Yoga Pratama', tipe: 'admin', jab: 'Super Admin', ini: 'YP' },
  nadia: {
    id: 'nadia',
    nama: 'Nadia Rahma',
    tipe: 'monitor',
    cluster: 'HCRC',
    jab: 'Monitor Cluster HCRC',
    ini: 'NR',
  },
  ferry: {
    id: 'ferry',
    nama: 'Ferry Gunawan',
    tipe: 'monitor',
    cluster: 'MedTech',
    jab: 'Monitor Cluster MedTech',
    ini: 'FG',
  },
}

export const AKUN_OPERASIONAL: readonly string[] = ['rina', 'sari', 'budi', 'tuti', 'hendra', 'ratna']
export const AKUN_PEMANTAUAN: readonly string[] = ['yoga', 'nadia', 'ferry']

/** Ambil peran berdasarkan id; jatuh ke Sekret Keuangan bila tidak dikenal. */
export function peranDari(id: string): Peran {
  const peran = PERAN[id] ?? PERAN['sari']
  if (!peran) throw new Error('Daftar peran kosong')
  return peran
}

/** Rute awal kategori → sekret. Bisa diubah Super Admin. */
export const RUTE_AWAL: RuteKategori = {
  Keuangan: 'sari',
  Kepegawaian: 'budi',
  Umum: 'tuti',
}

export const SEMUA_KATEGORI: readonly Kategori[] = ['Keuangan', 'Kepegawaian', 'Umum']
