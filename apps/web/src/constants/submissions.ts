import { stageIndexOf } from '@imeri/shared'
import type { Attachment, Category, Cluster, StageKey, Submission, TrailEntry } from '@/types'
import { DEFAULT_ROUTE, ROLES, roleById } from './roles'

const doc = (name: string, size: string): Attachment => ({
  name,
  type: name.endsWith('.xlsx') ? 'xls' : 'pdf',
  size,
})

/** Eight fully written documents — used as the worked examples on the detail screen. */
const DETAILED: readonly Submission[] = [
  {
    code: 'PJK-2609-014',
    title: 'Pengadaan reagen PCR triwulan IV',
    requester: 'Andi Prasetyo',
    requesterId: 'andi',
    cluster: 'MedTech',
    category: 'finance',
    createdAt: '9 Sep 2026',
    stageKey: 'deputy',
    daysInStage: 2,
    status: 'running',
    attachments: [
      doc('Nota dinas pengadaan reagen.pdf', '214 KB'),
      doc('Rincian kebutuhan per unit.xlsx', '88 KB'),
      doc('Perbandingan harga 3 vendor.xlsx', '132 KB'),
      doc('Foto stok gudang.pdf', '1,4 MB'),
    ],
    checklist: [],
    history: [
      { actor: 'Andi Prasetyo', role: 'Pengaju', action: 'mengirim pengajuan', time: '9 Sep · 09.14', kind: 'submit' },
      {
        actor: 'Sari Dewi',
        role: 'Sekret Keuangan',
        action: 'meneruskan ke Wadir',
        time: '9 Sep · 15.40',
        kind: 'approve',
      },
    ],
  },
  {
    code: 'PJK-2609-009',
    title: 'Perjalanan dinas simposium onkologi',
    requester: 'Rina Kartika',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'finance',
    createdAt: '2 Sep 2026',
    stageKey: 'director',
    daysInStage: 4,
    status: 'running',
    attachments: [
      doc('Undangan simposium.pdf', '96 KB'),
      doc('Surat tugas (draf).pdf', '74 KB'),
      doc('Rincian biaya perjalanan.xlsx', '62 KB'),
      doc('Tiket dan estimasi penginapan.pdf', '340 KB'),
      doc('Agenda kegiatan 3 hari.pdf', '128 KB'),
      doc('Daftar peserta.xlsx', '41 KB'),
    ],
    checklist: [],
    history: [
      { actor: 'Rina Kartika', role: 'Pengaju', action: 'mengirim pengajuan', time: '2 Sep · 11.02', kind: 'submit' },
      {
        actor: 'Sari Dewi',
        role: 'Sekret Keuangan',
        action: 'meneruskan ke Wadir',
        time: '3 Sep · 08.25',
        kind: 'approve',
      },
      {
        actor: 'Hendra Wijaya',
        role: 'Wadir',
        action: 'memberi paraf dan meneruskan ke Direktur',
        time: '4 Sep · 16.10',
        kind: 'approve',
      },
    ],
  },
  {
    code: 'PJP-2609-021',
    title: 'Permohonan cuti tahunan',
    requester: 'Rina Kartika',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'personnel',
    createdAt: '11 Sep 2026',
    stageKey: 'submitter',
    daysInStage: 1,
    status: 'returned',
    attachments: [doc('Form permohonan cuti.pdf', '58 KB'), doc('Rencana serah terima pekerjaan.pdf', '71 KB')],
    checklist: [
      { text: 'Samakan tanggal mulai cuti di form dengan surat permohonan', done: true },
      { text: 'Lampirkan surat persetujuan atasan langsung', done: false },
      { text: 'Cantumkan nama pegawai pengganti selama cuti', done: false },
    ],
    history: [
      { actor: 'Rina Kartika', role: 'Pengaju', action: 'mengirim pengajuan', time: '11 Sep · 08.40', kind: 'submit' },
      {
        actor: 'Budi Santoso',
        role: 'Sekret Kepegawaian',
        action: 'mengembalikan ke pengaju',
        time: '11 Sep · 14.05',
        kind: 'return',
        comment:
          'Surat persetujuan atasan langsung belum dilampirkan, dan tanggal mulai cuti di form berbeda dengan yang tertulis di surat permohonan. Nama pegawai pengganti juga belum dicantumkan.',
      },
    ],
  },
  {
    code: 'PJK-2609-018',
    title: 'Penggantian biaya pelatihan Good Clinical Practice',
    requester: 'Rina Kartika',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'finance',
    createdAt: '11 Sep 2026',
    stageKey: 'secretary',
    daysInStage: 1,
    status: 'running',
    attachments: [
      doc('Kuitansi pelatihan.pdf', '188 KB'),
      doc('Sertifikat peserta.pdf', '620 KB'),
      doc('Rekap peserta dan biaya.xlsx', '54 KB'),
    ],
    checklist: [],
    history: [
      { actor: 'Rina Kartika', role: 'Pengaju', action: 'mengirim pengajuan', time: '11 Sep · 16.22', kind: 'submit' },
    ],
  },
  {
    code: 'PJP-2609-024',
    title: 'Usulan mutasi analis laboratorium',
    requester: 'Lestari Ayu',
    requesterId: 'lestari',
    cluster: 'StemCell',
    category: 'personnel',
    createdAt: '10 Sep 2026',
    stageKey: 'deputy',
    daysInStage: 1,
    status: 'running',
    attachments: [
      doc('Usulan mutasi.pdf', '102 KB'),
      doc('Kajian kebutuhan formasi.pdf', '410 KB'),
      doc('Riwayat penempatan.xlsx', '66 KB'),
      doc('Persetujuan kepala cluster.pdf', '80 KB'),
      doc('Daftar staf terdampak.xlsx', '48 KB'),
    ],
    checklist: [],
    history: [
      { actor: 'Lestari Ayu', role: 'Pengaju', action: 'mengirim pengajuan', time: '10 Sep · 10.05', kind: 'submit' },
      {
        actor: 'Budi Santoso',
        role: 'Sekret Kepegawaian',
        action: 'meneruskan ke Wadir',
        time: '11 Sep · 09.30',
        kind: 'approve',
      },
    ],
  },
  {
    code: 'PJU-2609-030',
    title: 'Perbaikan pendingin ruang kultur sel',
    requester: 'Rina Kartika',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'general',
    createdAt: '10 Sep 2026',
    stageKey: 'secretary',
    daysInStage: 2,
    status: 'running',
    attachments: [doc('Laporan kerusakan unit.pdf', '144 KB'), doc('Penawaran servis vendor.pdf', '226 KB')],
    checklist: [],
    history: [
      { actor: 'Rina Kartika', role: 'Pengaju', action: 'mengirim pengajuan', time: '10 Sep · 13.48', kind: 'submit' },
    ],
  },
  {
    code: 'PJU-2609-033',
    title: 'Pengadaan jas laboratorium petugas',
    requester: 'Andi Prasetyo',
    requesterId: 'andi',
    cluster: 'MedTech',
    category: 'general',
    createdAt: '4 Sep 2026',
    stageKey: 'recording',
    daysInStage: 1,
    status: 'running',
    attachments: [
      doc('Rincian ukuran dan jumlah.xlsx', '39 KB'),
      doc('Penawaran konveksi.pdf', '310 KB'),
      doc('Lembar persetujuan direktur.pdf', '96 KB'),
    ],
    checklist: [],
    history: [
      { actor: 'Andi Prasetyo', role: 'Pengaju', action: 'mengirim pengajuan', time: '4 Sep · 09.00', kind: 'submit' },
      {
        actor: 'Tuti Marlina',
        role: 'Sekret Umum',
        action: 'meneruskan ke Wadir',
        time: '4 Sep · 14.12',
        kind: 'approve',
      },
      {
        actor: 'Hendra Wijaya',
        role: 'Wadir',
        action: 'memberi paraf dan meneruskan ke Direktur',
        time: '8 Sep · 11.35',
        kind: 'approve',
      },
      {
        actor: 'Ratna Puspita',
        role: 'Direktur',
        action: 'menyetujui dan menandatangani',
        time: '11 Sep · 10.18',
        kind: 'approve',
      },
    ],
  },
  {
    code: 'PJK-2608-097',
    title: 'Langganan lisensi perangkat lunak statistik',
    requester: 'Dimas Saputra',
    requesterId: 'dimas',
    cluster: 'DrugDevelopment',
    category: 'finance',
    createdAt: '21 Agu 2026',
    stageKey: 'done',
    daysInStage: 0,
    status: 'done',
    attachments: [
      doc('Proposal perpanjangan lisensi.pdf', '290 KB'),
      doc('Invoice vendor.pdf', '118 KB'),
      doc('Perbandingan paket lisensi.xlsx', '77 KB'),
      doc('Dokumen final bertanda tangan.pdf', '1,1 MB'),
    ],
    checklist: [],
    history: [
      { actor: 'Dimas Saputra', role: 'Pengaju', action: 'mengirim pengajuan', time: '21 Agu · 09.10', kind: 'submit' },
      {
        actor: 'Sari Dewi',
        role: 'Sekret Keuangan',
        action: 'meneruskan ke Wadir',
        time: '21 Agu · 15.02',
        kind: 'approve',
      },
      {
        actor: 'Hendra Wijaya',
        role: 'Wadir',
        action: 'memberi paraf dan meneruskan ke Direktur',
        time: '24 Agu · 10.40',
        kind: 'approve',
      },
      {
        actor: 'Ratna Puspita',
        role: 'Direktur',
        action: 'menyetujui dan menandatangani',
        time: '25 Agu · 16.55',
        kind: 'approve',
      },
      {
        actor: 'Sari Dewi',
        role: 'Sekret Keuangan',
        action: 'merekam hasil dan memberi tahu pengaju',
        time: '26 Agu · 08.30',
        kind: 'approve',
      },
    ],
  },
]

const COMMON_ATTACHMENTS: Readonly<Record<Category, readonly string[]>> = {
  finance: ['Nota dinas pengajuan.pdf', 'Rincian biaya.xlsx', 'Penawaran vendor.pdf', 'Bukti pendukung.pdf'],
  personnel: [
    'Surat permohonan.pdf',
    'Persetujuan atasan langsung.pdf',
    'Riwayat kepegawaian.xlsx',
    'Lampiran pendukung.pdf',
  ],
  general: ['Laporan kondisi.pdf', 'Penawaran vendor.pdf', 'Foto dokumentasi.pdf', 'Rincian kebutuhan.xlsx'],
}

/** History consistent with the stage the document stopped at. */
function autoHistory(
  requester: string,
  category: Category,
  stageKey: StageKey,
  status: Submission['status'],
  time: string,
): readonly TrailEntry[] {
  const secretary = roleById(DEFAULT_ROUTE[category])
  const trail: TrailEntry[] = [
    { actor: requester, role: 'Pengaju', action: 'mengirim pengajuan', time, kind: 'submit' },
  ]

  if (status === 'returned') {
    trail.push({
      actor: secretary.name,
      role: secretary.position,
      action: 'mengembalikan ke pengaju',
      time,
      kind: 'return',
      comment: 'Dokumen pendukung yang diminta belum lengkap.',
    })
    return trail
  }
  if (stageIndexOf(stageKey) >= 2) {
    trail.push({
      actor: secretary.name,
      role: secretary.position,
      action: 'meneruskan ke Wadir',
      time,
      kind: 'approve',
    })
  }
  if (stageIndexOf(stageKey) >= 3) {
    trail.push({
      actor: ROLES['hendra']?.name ?? 'Wadir',
      role: 'Wadir',
      action: 'memberi paraf dan meneruskan ke Direktur',
      time,
      kind: 'approve',
    })
  }
  if (stageIndexOf(stageKey) >= 4) {
    trail.push({
      actor: ROLES['ratna']?.name ?? 'Direktur',
      role: 'Direktur',
      action: 'menyetujui dan menandatangani',
      time,
      kind: 'approve',
    })
  }
  if (stageIndexOf(stageKey) >= 5) {
    trail.push({
      actor: secretary.name,
      role: secretary.position,
      action: 'merekam hasil dan memberi tahu pengaju',
      time,
      kind: 'approve',
    })
  }
  return trail
}

/** Extra documents so the monitoring board has a realistic spread. */
function make(
  code: string,
  title: string,
  requester: string,
  requesterId: string,
  cluster: Cluster,
  category: Category,
  createdAt: string,
  stageKey: StageKey,
  daysInStage: number,
  status: Submission['status'],
  attachmentCount: number,
): Submission {
  return {
    code,
    title,
    requester,
    requesterId,
    cluster,
    category,
    createdAt,
    stageKey,
    daysInStage,
    status,
    attachments: COMMON_ATTACHMENTS[category]
      .slice(0, attachmentCount)
      .map((name) => doc(name, `${48 + name.length * 9} KB`)),
    checklist:
      status === 'returned'
        ? [
            { text: 'Lengkapi dokumen pendukung yang diminta Sekret', done: false },
            { text: 'Perbaiki rincian yang tidak sesuai', done: false },
          ]
        : [],
    history: autoHistory(requester, category, stageKey, status, createdAt),
  }
}

const GENERATED: readonly Submission[] = [
  make('PJK-2609-011', 'Kalibrasi tahunan mikroskop konfokal', 'Dimas Saputra', 'dimas', 'DrugDevelopment', 'finance', '8 Sep 2026', 'deputy', 3, 'running', 3),
  make('PJK-2609-006', 'Pemeliharaan kendaraan operasional spesimen', 'Andi Prasetyo', 'andi', 'MedTech', 'finance', '5 Sep 2026', 'recording', 1, 'running', 4),
  make('PJP-2609-015', 'Usulan kenaikan jenjang jabatan peneliti', 'Lestari Ayu', 'lestari', 'StemCell', 'personnel', '9 Sep 2026', 'secretary', 1, 'running', 3),
  make('PJP-2609-019', 'Permohonan izin belajar', 'Dimas Saputra', 'dimas', 'DrugDevelopment', 'personnel', '10 Sep 2026', 'submitter', 2, 'returned', 2),
  make('PJU-2609-022', 'Penggantian lampu koridor laboratorium', 'Andi Prasetyo', 'andi', 'MedTech', 'general', '10 Sep 2026', 'secretary', 3, 'running', 2),
  make('PJU-2609-027', 'Sewa tenda kegiatan bakti kesehatan', 'Rina Kartika', 'rina', 'HCRC', 'general', '9 Sep 2026', 'deputy', 2, 'running', 3),
  make('PJU-2609-012', 'Perbaikan pintu ruang penyimpanan spesimen', 'Andi Prasetyo', 'andi', 'MedTech', 'general', '8 Sep 2026', 'director', 3, 'running', 2),
  make('PJK-2609-002', 'Konsumsi rapat koordinasi peneliti', 'Rina Kartika', 'rina', 'HCRC', 'finance', '1 Sep 2026', 'done', 0, 'done', 3),
  make('PJP-2609-005', 'Mutasi internal staf laboratorium', 'Dimas Saputra', 'dimas', 'DrugDevelopment', 'personnel', '3 Sep 2026', 'done', 0, 'done', 3),
  make('PJK-2608-088', 'Pengadaan freezer penyimpanan −80°C', 'Andi Prasetyo', 'andi', 'MedTech', 'finance', '18 Agu 2026', 'done', 0, 'done', 4),
  make('PJP-2608-091', 'Perpanjangan kontrak tenaga alih daya', 'Lestari Ayu', 'lestari', 'StemCell', 'personnel', '19 Agu 2026', 'done', 0, 'done', 4),
  make('PJU-2608-094', 'Pengecatan ulang koridor laboratorium', 'Rina Kartika', 'rina', 'HCRC', 'general', '20 Agu 2026', 'done', 0, 'done', 3),
]

export const SUBMISSION_SEED: readonly Submission[] = [...DETAILED, ...GENERATED]

export const CODE_PREFIX: Readonly<Record<Category, string>> = {
  finance: 'PJK',
  personnel: 'PJP',
  general: 'PJU',
}
