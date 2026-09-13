import type { Tahap } from '@/types'

/**
 * Enam tahap yang dilewati satu berkas. Angka `sla` adalah nilai awal —
 * Super Admin bisa mengubahnya saat aplikasi berjalan lewat `alurAtom`.
 */
export const TAHAPAN_AWAL: readonly Tahap[] = [
  { key: 'pengaju', meja: 'Pengaju', aksi: 'Penyusunan berkas', sla: null },
  { key: 'sekret', meja: 'Sekret', aksi: 'Verifikasi berkas', sla: 1 },
  { key: 'wadir', meja: 'Wadir', aksi: 'QC & paraf', sla: 2 },
  { key: 'direktur', meja: 'Direktur', aksi: 'Persetujuan', sla: 2 },
  { key: 'rekam', meja: 'Sekret', aksi: 'Rekam & arsip', sla: 1 },
  { key: 'selesai', meja: 'Pengaju', aksi: 'Selesai', sla: null },
]

/** Label tombol "maju" per tahap. */
export const LABEL_MAJU: Readonly<Record<string, string>> = {
  pengaju: 'Ajukan ulang',
  sekret: 'Teruskan ke Wadir',
  wadir: 'Paraf & teruskan ke Direktur',
  direktur: 'Setujui & tanda tangani',
  rekam: 'Rekam & beri tahu pengaju',
}

/** Label tombol "kembalikan" per tahap; tahap pengaju tidak punya. */
export const LABEL_TOLAK: Readonly<Record<string, string>> = {
  sekret: 'Kembalikan ke pengaju',
  wadir: 'Kembalikan ke Sekret',
  direktur: 'Kembalikan ke Wadir',
  rekam: 'Kembalikan ke Direktur',
}

/** Kalimat riwayat saat berkas diteruskan dari tahap tertentu. */
export const JEJAK_MAJU: Readonly<Record<string, string>> = {
  pengaju: 'mengajukan ulang setelah perbaikan',
  sekret: 'meneruskan ke Wadir',
  wadir: 'memberi paraf dan meneruskan ke Direktur',
  direktur: 'menyetujui dan menandatangani',
  rekam: 'merekam hasil dan memberi tahu pengaju',
}
