/** Tipe domain pengajuan dokumen IMERI — dipakai bersama web dan (nanti) api. */

export type Kategori = 'Keuangan' | 'Kepegawaian' | 'Umum'

export type Cluster = 'HCRC' | 'MedTech' | 'Stem Cell' | 'Drug Development'

/** Enam tahap yang dilewati satu berkas, berurutan. */
export type TahapKey = 'pengaju' | 'sekret' | 'wadir' | 'direktur' | 'rekam' | 'selesai'

export type StatusPengajuan = 'berjalan' | 'dikembalikan' | 'selesai'

export type PeranTipe = 'pengaju' | 'sekret' | 'wadir' | 'direktur' | 'admin' | 'monitor'

export type JejakJenis = 'up' | 'ok' | 'no'

export interface Tahap {
  readonly key: TahapKey
  /** Meja yang memegang berkas pada tahap ini. */
  readonly meja: string
  /** Pekerjaan yang dilakukan di meja itu. */
  readonly aksi: string
  /** Batas hari untuk tahap ini; null berarti tidak dibatasi. */
  readonly sla: number | null
}

export interface Lampiran {
  readonly nama: string
  readonly tipe: 'pdf' | 'xls'
  readonly ukuran: string
}

export interface ChecklistItem {
  readonly teks: string
  readonly done: boolean
}

export interface JejakItem {
  readonly aktor: string
  readonly peran: string
  readonly aksi: string
  readonly waktu: string
  readonly jenis: JejakJenis
  readonly komentar?: string
}

export interface Pengajuan {
  readonly kode: string
  readonly judul: string
  readonly pemohon: string
  readonly pemohonId: string
  readonly cluster: Cluster
  readonly kategori: Kategori
  readonly dibuat: string
  /** Indeks ke daftar tahap (0..5). */
  readonly tahap: number
  /** Hari ke berapa berkas berada di tahap sekarang. */
  readonly hari: number
  readonly status: StatusPengajuan
  readonly lampiran: readonly Lampiran[]
  readonly checklist: readonly ChecklistItem[]
  readonly riwayat: readonly JejakItem[]
}

export interface Peran {
  readonly id: string
  readonly nama: string
  readonly tipe: PeranTipe
  /** Jabatan yang ditampilkan di kartu pengguna dan pemilih akun. */
  readonly jab: string
  /** Inisial untuk avatar. */
  readonly ini: string
  /** Hanya untuk sekret — kategori yang menjadi tanggung jawabnya. */
  readonly kategori?: Kategori
  /** Hanya untuk monitor cluster — cluster yang dipantaunya. */
  readonly cluster?: Cluster
}

/** Rute kategori → id sekret yang menerimanya. */
export type RuteKategori = Readonly<Record<Kategori, string>>

export interface Pegawai {
  readonly nama: string
  readonly peran: string
  readonly cluster: Cluster | 'Lintas cluster'
  /** Rata-rata hari memegang berkas, 30 hari terakhir. */
  readonly rata: number
  readonly selesai30: number
}

export interface StatCluster {
  readonly rata: number
  readonly selesai30: number
  readonly pegawai: number
}

/** [tanggal, berkas masuk, berkas selesai] */
export type TitikHarian = readonly [string, number, number]
