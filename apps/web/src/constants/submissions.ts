import type { Cluster, JejakItem, Kategori, Lampiran, Pengajuan } from '@/types'
import { PERAN, RUTE_AWAL, peranDari } from './peran'

const dok = (nama: string, ukuran: string): Lampiran => ({
  nama,
  tipe: nama.endsWith('.xlsx') ? 'xls' : 'pdf',
  ukuran,
})

/** Delapan berkas yang ditulis lengkap — dipakai sebagai contoh di layar detail. */
const INTI: readonly Pengajuan[] = [
  {
    kode: 'PJK-2609-014',
    judul: 'Pengadaan reagen PCR triwulan IV',
    pemohon: 'Andi Prasetyo',
    pemohonId: 'andi',
    cluster: 'MedTech',
    kategori: 'Keuangan',
    dibuat: '9 Sep 2026',
    tahap: 2,
    hari: 2,
    status: 'berjalan',
    lampiran: [
      dok('Nota dinas pengadaan reagen.pdf', '214 KB'),
      dok('Rincian kebutuhan per unit.xlsx', '88 KB'),
      dok('Perbandingan harga 3 vendor.xlsx', '132 KB'),
      dok('Foto stok gudang.pdf', '1,4 MB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Andi Prasetyo', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '9 Sep · 09.14', jenis: 'up' },
      { aktor: 'Sari Dewi', peran: 'Sekret Keuangan', aksi: 'meneruskan ke Wadir', waktu: '9 Sep · 15.40', jenis: 'ok' },
    ],
  },
  {
    kode: 'PJK-2609-009',
    judul: 'Perjalanan dinas simposium onkologi',
    pemohon: 'Rina Kartika',
    pemohonId: 'rina',
    cluster: 'HCRC',
    kategori: 'Keuangan',
    dibuat: '2 Sep 2026',
    tahap: 3,
    hari: 4,
    status: 'berjalan',
    lampiran: [
      dok('Undangan simposium.pdf', '96 KB'),
      dok('Surat tugas (draf).pdf', '74 KB'),
      dok('Rincian biaya perjalanan.xlsx', '62 KB'),
      dok('Tiket dan estimasi penginapan.pdf', '340 KB'),
      dok('Agenda kegiatan 3 hari.pdf', '128 KB'),
      dok('Daftar peserta.xlsx', '41 KB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Rina Kartika', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '2 Sep · 11.02', jenis: 'up' },
      { aktor: 'Sari Dewi', peran: 'Sekret Keuangan', aksi: 'meneruskan ke Wadir', waktu: '3 Sep · 08.25', jenis: 'ok' },
      {
        aktor: 'Hendra Wijaya',
        peran: 'Wadir',
        aksi: 'memberi paraf dan meneruskan ke Direktur',
        waktu: '4 Sep · 16.10',
        jenis: 'ok',
      },
    ],
  },
  {
    kode: 'PJP-2609-021',
    judul: 'Permohonan cuti tahunan',
    pemohon: 'Rina Kartika',
    pemohonId: 'rina',
    cluster: 'HCRC',
    kategori: 'Kepegawaian',
    dibuat: '11 Sep 2026',
    tahap: 0,
    hari: 1,
    status: 'dikembalikan',
    lampiran: [dok('Form permohonan cuti.pdf', '58 KB'), dok('Rencana serah terima pekerjaan.pdf', '71 KB')],
    checklist: [
      { teks: 'Samakan tanggal mulai cuti di form dengan surat permohonan', done: true },
      { teks: 'Lampirkan surat persetujuan atasan langsung', done: false },
      { teks: 'Cantumkan nama pegawai pengganti selama cuti', done: false },
    ],
    riwayat: [
      { aktor: 'Rina Kartika', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '11 Sep · 08.40', jenis: 'up' },
      {
        aktor: 'Budi Santoso',
        peran: 'Sekret Kepegawaian',
        aksi: 'mengembalikan ke pengaju',
        waktu: '11 Sep · 14.05',
        jenis: 'no',
        komentar:
          'Surat persetujuan atasan langsung belum dilampirkan, dan tanggal mulai cuti di form berbeda dengan yang tertulis di surat permohonan. Nama pegawai pengganti juga belum dicantumkan.',
      },
    ],
  },
  {
    kode: 'PJK-2609-018',
    judul: 'Penggantian biaya pelatihan Good Clinical Practice',
    pemohon: 'Rina Kartika',
    pemohonId: 'rina',
    cluster: 'HCRC',
    kategori: 'Keuangan',
    dibuat: '11 Sep 2026',
    tahap: 1,
    hari: 1,
    status: 'berjalan',
    lampiran: [
      dok('Kuitansi pelatihan.pdf', '188 KB'),
      dok('Sertifikat peserta.pdf', '620 KB'),
      dok('Rekap peserta dan biaya.xlsx', '54 KB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Rina Kartika', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '11 Sep · 16.22', jenis: 'up' },
    ],
  },
  {
    kode: 'PJP-2609-024',
    judul: 'Usulan mutasi analis laboratorium',
    pemohon: 'Lestari Ayu',
    pemohonId: 'lestari',
    cluster: 'Stem Cell',
    kategori: 'Kepegawaian',
    dibuat: '10 Sep 2026',
    tahap: 2,
    hari: 1,
    status: 'berjalan',
    lampiran: [
      dok('Usulan mutasi.pdf', '102 KB'),
      dok('Kajian kebutuhan formasi.pdf', '410 KB'),
      dok('Riwayat penempatan.xlsx', '66 KB'),
      dok('Persetujuan kepala cluster.pdf', '80 KB'),
      dok('Daftar staf terdampak.xlsx', '48 KB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Lestari Ayu', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '10 Sep · 10.05', jenis: 'up' },
      {
        aktor: 'Budi Santoso',
        peran: 'Sekret Kepegawaian',
        aksi: 'meneruskan ke Wadir',
        waktu: '11 Sep · 09.30',
        jenis: 'ok',
      },
    ],
  },
  {
    kode: 'PJU-2609-030',
    judul: 'Perbaikan pendingin ruang kultur sel',
    pemohon: 'Rina Kartika',
    pemohonId: 'rina',
    cluster: 'HCRC',
    kategori: 'Umum',
    dibuat: '10 Sep 2026',
    tahap: 1,
    hari: 2,
    status: 'berjalan',
    lampiran: [dok('Laporan kerusakan unit.pdf', '144 KB'), dok('Penawaran servis vendor.pdf', '226 KB')],
    checklist: [],
    riwayat: [
      { aktor: 'Rina Kartika', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '10 Sep · 13.48', jenis: 'up' },
    ],
  },
  {
    kode: 'PJU-2609-033',
    judul: 'Pengadaan jas laboratorium petugas',
    pemohon: 'Andi Prasetyo',
    pemohonId: 'andi',
    cluster: 'MedTech',
    kategori: 'Umum',
    dibuat: '4 Sep 2026',
    tahap: 4,
    hari: 1,
    status: 'berjalan',
    lampiran: [
      dok('Rincian ukuran dan jumlah.xlsx', '39 KB'),
      dok('Penawaran konveksi.pdf', '310 KB'),
      dok('Lembar persetujuan direktur.pdf', '96 KB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Andi Prasetyo', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '4 Sep · 09.00', jenis: 'up' },
      { aktor: 'Tuti Marlina', peran: 'Sekret Umum', aksi: 'meneruskan ke Wadir', waktu: '4 Sep · 14.12', jenis: 'ok' },
      {
        aktor: 'Hendra Wijaya',
        peran: 'Wadir',
        aksi: 'memberi paraf dan meneruskan ke Direktur',
        waktu: '8 Sep · 11.35',
        jenis: 'ok',
      },
      {
        aktor: 'Ratna Puspita',
        peran: 'Direktur',
        aksi: 'menyetujui dan menandatangani',
        waktu: '11 Sep · 10.18',
        jenis: 'ok',
      },
    ],
  },
  {
    kode: 'PJK-2608-097',
    judul: 'Langganan lisensi perangkat lunak statistik',
    pemohon: 'Dimas Saputra',
    pemohonId: 'dimas',
    cluster: 'Drug Development',
    kategori: 'Keuangan',
    dibuat: '21 Agu 2026',
    tahap: 5,
    hari: 0,
    status: 'selesai',
    lampiran: [
      dok('Proposal perpanjangan lisensi.pdf', '290 KB'),
      dok('Invoice vendor.pdf', '118 KB'),
      dok('Perbandingan paket lisensi.xlsx', '77 KB'),
      dok('Dokumen final bertanda tangan.pdf', '1,1 MB'),
    ],
    checklist: [],
    riwayat: [
      { aktor: 'Dimas Saputra', peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu: '21 Agu · 09.10', jenis: 'up' },
      { aktor: 'Sari Dewi', peran: 'Sekret Keuangan', aksi: 'meneruskan ke Wadir', waktu: '21 Agu · 15.02', jenis: 'ok' },
      {
        aktor: 'Hendra Wijaya',
        peran: 'Wadir',
        aksi: 'memberi paraf dan meneruskan ke Direktur',
        waktu: '24 Agu · 10.40',
        jenis: 'ok',
      },
      {
        aktor: 'Ratna Puspita',
        peran: 'Direktur',
        aksi: 'menyetujui dan menandatangani',
        waktu: '25 Agu · 16.55',
        jenis: 'ok',
      },
      {
        aktor: 'Sari Dewi',
        peran: 'Sekret Keuangan',
        aksi: 'merekam hasil dan memberi tahu pengaju',
        waktu: '26 Agu · 08.30',
        jenis: 'ok',
      },
    ],
  },
]

const LAMPIRAN_UMUM: Readonly<Record<Kategori, readonly string[]>> = {
  Keuangan: ['Nota dinas pengajuan.pdf', 'Rincian biaya.xlsx', 'Penawaran vendor.pdf', 'Bukti pendukung.pdf'],
  Kepegawaian: [
    'Surat permohonan.pdf',
    'Persetujuan atasan langsung.pdf',
    'Riwayat kepegawaian.xlsx',
    'Lampiran pendukung.pdf',
  ],
  Umum: ['Laporan kondisi.pdf', 'Penawaran vendor.pdf', 'Foto dokumentasi.pdf', 'Rincian kebutuhan.xlsx'],
}

/** Riwayat yang konsisten dengan tahap tempat berkas berhenti. */
function jejakOtomatis(
  pemohon: string,
  kategori: Kategori,
  tahap: number,
  status: Pengajuan['status'],
  waktu: string,
): readonly JejakItem[] {
  const sekret = peranDari(RUTE_AWAL[kategori])
  const jejak: JejakItem[] = [{ aktor: pemohon, peran: 'Pengaju', aksi: 'mengirim pengajuan', waktu, jenis: 'up' }]

  if (status === 'dikembalikan') {
    jejak.push({
      aktor: sekret.nama,
      peran: sekret.jab,
      aksi: 'mengembalikan ke pengaju',
      waktu,
      jenis: 'no',
      komentar: 'Dokumen pendukung yang diminta belum lengkap.',
    })
    return jejak
  }
  if (tahap >= 2) jejak.push({ aktor: sekret.nama, peran: sekret.jab, aksi: 'meneruskan ke Wadir', waktu, jenis: 'ok' })
  if (tahap >= 3) {
    jejak.push({
      aktor: PERAN['hendra']?.nama ?? 'Wadir',
      peran: 'Wadir',
      aksi: 'memberi paraf dan meneruskan ke Direktur',
      waktu,
      jenis: 'ok',
    })
  }
  if (tahap >= 4) {
    jejak.push({
      aktor: PERAN['ratna']?.nama ?? 'Direktur',
      peran: 'Direktur',
      aksi: 'menyetujui dan menandatangani',
      waktu,
      jenis: 'ok',
    })
  }
  if (tahap >= 5) {
    jejak.push({
      aktor: sekret.nama,
      peran: sekret.jab,
      aksi: 'merekam hasil dan memberi tahu pengaju',
      waktu,
      jenis: 'ok',
    })
  }
  return jejak
}

/** Berkas tambahan supaya papan pemantauan punya sebaran yang wajar. */
function bikin(
  kode: string,
  judul: string,
  pemohon: string,
  pemohonId: string,
  cluster: Cluster,
  kategori: Kategori,
  dibuat: string,
  tahap: number,
  hari: number,
  status: Pengajuan['status'],
  jumlahLampiran: number,
): Pengajuan {
  return {
    kode,
    judul,
    pemohon,
    pemohonId,
    cluster,
    kategori,
    dibuat,
    tahap,
    hari,
    status,
    lampiran: LAMPIRAN_UMUM[kategori].slice(0, jumlahLampiran).map((nama) => dok(nama, `${48 + nama.length * 9} KB`)),
    checklist:
      status === 'dikembalikan'
        ? [
            { teks: 'Lengkapi dokumen pendukung yang diminta Sekret', done: false },
            { teks: 'Perbaiki rincian yang tidak sesuai', done: false },
          ]
        : [],
    riwayat: jejakOtomatis(pemohon, kategori, tahap, status, dibuat),
  }
}

const TAMBAHAN: readonly Pengajuan[] = [
  bikin('PJK-2609-011', 'Kalibrasi tahunan mikroskop konfokal', 'Dimas Saputra', 'dimas', 'Drug Development', 'Keuangan', '8 Sep 2026', 2, 3, 'berjalan', 3),
  bikin('PJK-2609-006', 'Pemeliharaan kendaraan operasional spesimen', 'Andi Prasetyo', 'andi', 'MedTech', 'Keuangan', '5 Sep 2026', 4, 1, 'berjalan', 4),
  bikin('PJP-2609-015', 'Usulan kenaikan jenjang jabatan peneliti', 'Lestari Ayu', 'lestari', 'Stem Cell', 'Kepegawaian', '9 Sep 2026', 1, 1, 'berjalan', 3),
  bikin('PJP-2609-019', 'Permohonan izin belajar', 'Dimas Saputra', 'dimas', 'Drug Development', 'Kepegawaian', '10 Sep 2026', 0, 2, 'dikembalikan', 2),
  bikin('PJU-2609-022', 'Penggantian lampu koridor laboratorium', 'Andi Prasetyo', 'andi', 'MedTech', 'Umum', '10 Sep 2026', 1, 3, 'berjalan', 2),
  bikin('PJU-2609-027', 'Sewa tenda kegiatan bakti kesehatan', 'Rina Kartika', 'rina', 'HCRC', 'Umum', '9 Sep 2026', 2, 2, 'berjalan', 3),
  bikin('PJU-2609-012', 'Perbaikan pintu ruang penyimpanan spesimen', 'Andi Prasetyo', 'andi', 'MedTech', 'Umum', '8 Sep 2026', 3, 3, 'berjalan', 2),
  bikin('PJK-2609-002', 'Konsumsi rapat koordinasi peneliti', 'Rina Kartika', 'rina', 'HCRC', 'Keuangan', '1 Sep 2026', 5, 0, 'selesai', 3),
  bikin('PJP-2609-005', 'Mutasi internal staf laboratorium', 'Dimas Saputra', 'dimas', 'Drug Development', 'Kepegawaian', '3 Sep 2026', 5, 0, 'selesai', 3),
  bikin('PJK-2608-088', 'Pengadaan freezer penyimpanan −80°C', 'Andi Prasetyo', 'andi', 'MedTech', 'Keuangan', '18 Agu 2026', 5, 0, 'selesai', 4),
  bikin('PJP-2608-091', 'Perpanjangan kontrak tenaga alih daya', 'Lestari Ayu', 'lestari', 'Stem Cell', 'Kepegawaian', '19 Agu 2026', 5, 0, 'selesai', 4),
  bikin('PJU-2608-094', 'Pengecatan ulang koridor laboratorium', 'Rina Kartika', 'rina', 'HCRC', 'Umum', '20 Agu 2026', 5, 0, 'selesai', 3),
]

export const PENGAJUAN_SEED: readonly Pengajuan[] = [...INTI, ...TAMBAHAN]

export const AWALAN_KODE: Readonly<Record<Kategori, string>> = {
  Keuangan: 'PJK',
  Kepegawaian: 'PJP',
  Umum: 'PJU',
}
