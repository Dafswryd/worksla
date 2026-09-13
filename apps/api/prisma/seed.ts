import { prisma } from '../src/db/client'
import { hashPassword } from '../src/modules/auth/service'

const DEV_PASSWORD = 'prototipe123'
const MS_PER_DAY = 86_400_000

type RoleTypeValue = 'submitter' | 'secretary' | 'deputy' | 'director' | 'admin' | 'monitor'
type CategoryValue = 'finance' | 'personnel' | 'general'
type ClusterValue = 'HCRC' | 'MedTech' | 'StemCell' | 'DrugDevelopment'
type StageKeyValue = 'submitter' | 'secretary' | 'deputy' | 'director' | 'recording' | 'done'
type StatusValue = 'running' | 'returned' | 'done'

interface SeedUser {
  readonly key: string
  readonly email: string
  readonly name: string
  readonly type: RoleTypeValue
  readonly position: string
  readonly initials: string
  readonly category?: CategoryValue
  readonly cluster?: ClusterValue
}

/**
 * The nine login accounts from the prototype's role list, plus three
 * requester-only people (`andi`, `lestari`, `dimas`) who appear as the
 * requester on submissions in `apps/web/src/constants/submissions.ts` but were
 * never part of the frontend's `ROLES` map — they cannot log in there.
 *
 * `Submission.requesterId` is a required foreign key to `User`, so any
 * submission attributed to them still needs a real row to point at. Without
 * one, either the FK constraint fails or every submission would have to be
 * misattributed to `rina`, losing the requester names the brief asks to copy
 * verbatim. Twelve users is therefore correct, not a bug — see the seed
 * report for the full reasoning.
 */
const USERS: readonly SeedUser[] = [
  { key: 'rina', email: 'rina.k@ui.ac.id', name: 'Rina Kartika', type: 'submitter', position: 'Pengaju · Cluster HCRC', initials: 'RK', cluster: 'HCRC' },
  { key: 'sari', email: 'sari.d@ui.ac.id', name: 'Sari Dewi', type: 'secretary', position: 'Sekret Keuangan', initials: 'SD', category: 'finance' },
  { key: 'budi', email: 'budi.s@ui.ac.id', name: 'Budi Santoso', type: 'secretary', position: 'Sekret Kepegawaian', initials: 'BS', category: 'personnel' },
  { key: 'tuti', email: 'tuti.m@ui.ac.id', name: 'Tuti Marlina', type: 'secretary', position: 'Sekret Umum', initials: 'TM', category: 'general' },
  { key: 'hendra', email: 'hendra.w@ui.ac.id', name: 'Hendra Wijaya', type: 'deputy', position: 'Wakil Direktur', initials: 'HW' },
  { key: 'ratna', email: 'ratna.p@ui.ac.id', name: 'Ratna Puspita', type: 'director', position: 'Direktur', initials: 'RP' },
  { key: 'yoga', email: 'yoga.p@ui.ac.id', name: 'Yoga Pratama', type: 'admin', position: 'Super Admin', initials: 'YP' },
  { key: 'nadia', email: 'nadia.r@ui.ac.id', name: 'Nadia Rahma', type: 'monitor', position: 'Monitor Cluster HCRC', initials: 'NR', cluster: 'HCRC' },
  { key: 'ferry', email: 'ferry.g@ui.ac.id', name: 'Ferry Gunawan', type: 'monitor', position: 'Monitor Cluster MedTech', initials: 'FG', cluster: 'MedTech' },
  { key: 'andi', email: 'andi.p@ui.ac.id', name: 'Andi Prasetyo', type: 'submitter', position: 'Pengaju · Cluster MedTech', initials: 'AP', cluster: 'MedTech' },
  { key: 'lestari', email: 'lestari.a@ui.ac.id', name: 'Lestari Ayu', type: 'submitter', position: 'Pengaju · Cluster StemCell', initials: 'LA', cluster: 'StemCell' },
  { key: 'dimas', email: 'dimas.s@ui.ac.id', name: 'Dimas Saputra', type: 'submitter', position: 'Pengaju · Cluster DrugDevelopment', initials: 'DS', cluster: 'DrugDevelopment' },
]

const SLA: Readonly<Record<StageKeyValue, number | null>> = {
  submitter: null,
  secretary: 1,
  deputy: 2,
  director: 2,
  recording: 1,
  done: null,
}

const ROUTE: Readonly<Record<CategoryValue, string>> = {
  finance: 'sari',
  personnel: 'budi',
  general: 'tuti',
}

interface SeedChecklistItem {
  readonly text: string
  readonly done: boolean
}

interface SeedSubmission {
  readonly code: string
  readonly title: string
  readonly requesterKey: string
  readonly cluster: ClusterValue
  readonly category: CategoryValue
  readonly stageKey: StageKeyValue
  readonly daysInStage: number
  readonly status: StatusValue
  readonly checklist?: readonly SeedChecklistItem[]
}

/**
 * The twenty submissions from `apps/web/src/constants/submissions.ts`, copied
 * verbatim: code, title, requester, cluster, category, stage key, day count,
 * status, and (for the two returned ones) the checklist texts. Documents are
 * deliberately not seeded — see the seed report.
 */
const SUBMISSIONS: readonly SeedSubmission[] = [
  { code: 'PJK-2609-014', title: 'Pengadaan reagen PCR triwulan IV', requesterKey: 'andi', cluster: 'MedTech', category: 'finance', stageKey: 'deputy', daysInStage: 2, status: 'running' },
  { code: 'PJK-2609-009', title: 'Perjalanan dinas simposium onkologi', requesterKey: 'rina', cluster: 'HCRC', category: 'finance', stageKey: 'director', daysInStage: 4, status: 'running' },
  {
    code: 'PJP-2609-021',
    title: 'Permohonan cuti tahunan',
    requesterKey: 'rina',
    cluster: 'HCRC',
    category: 'personnel',
    stageKey: 'submitter',
    daysInStage: 1,
    status: 'returned',
    checklist: [
      { text: 'Samakan tanggal mulai cuti di form dengan surat permohonan', done: true },
      { text: 'Lampirkan surat persetujuan atasan langsung', done: false },
      { text: 'Cantumkan nama pegawai pengganti selama cuti', done: false },
    ],
  },
  { code: 'PJK-2609-018', title: 'Penggantian biaya pelatihan Good Clinical Practice', requesterKey: 'rina', cluster: 'HCRC', category: 'finance', stageKey: 'secretary', daysInStage: 1, status: 'running' },
  { code: 'PJP-2609-024', title: 'Usulan mutasi analis laboratorium', requesterKey: 'lestari', cluster: 'StemCell', category: 'personnel', stageKey: 'deputy', daysInStage: 1, status: 'running' },
  { code: 'PJU-2609-030', title: 'Perbaikan pendingin ruang kultur sel', requesterKey: 'rina', cluster: 'HCRC', category: 'general', stageKey: 'secretary', daysInStage: 2, status: 'running' },
  { code: 'PJU-2609-033', title: 'Pengadaan jas laboratorium petugas', requesterKey: 'andi', cluster: 'MedTech', category: 'general', stageKey: 'recording', daysInStage: 1, status: 'running' },
  { code: 'PJK-2608-097', title: 'Langganan lisensi perangkat lunak statistik', requesterKey: 'dimas', cluster: 'DrugDevelopment', category: 'finance', stageKey: 'done', daysInStage: 0, status: 'done' },
  { code: 'PJK-2609-011', title: 'Kalibrasi tahunan mikroskop konfokal', requesterKey: 'dimas', cluster: 'DrugDevelopment', category: 'finance', stageKey: 'deputy', daysInStage: 3, status: 'running' },
  { code: 'PJK-2609-006', title: 'Pemeliharaan kendaraan operasional spesimen', requesterKey: 'andi', cluster: 'MedTech', category: 'finance', stageKey: 'recording', daysInStage: 1, status: 'running' },
  { code: 'PJP-2609-015', title: 'Usulan kenaikan jenjang jabatan peneliti', requesterKey: 'lestari', cluster: 'StemCell', category: 'personnel', stageKey: 'secretary', daysInStage: 1, status: 'running' },
  {
    code: 'PJP-2609-019',
    title: 'Permohonan izin belajar',
    requesterKey: 'dimas',
    cluster: 'DrugDevelopment',
    category: 'personnel',
    stageKey: 'submitter',
    daysInStage: 2,
    status: 'returned',
    checklist: [
      { text: 'Lengkapi dokumen pendukung yang diminta Sekret', done: false },
      { text: 'Perbaiki rincian yang tidak sesuai', done: false },
    ],
  },
  { code: 'PJU-2609-022', title: 'Penggantian lampu koridor laboratorium', requesterKey: 'andi', cluster: 'MedTech', category: 'general', stageKey: 'secretary', daysInStage: 3, status: 'running' },
  { code: 'PJU-2609-027', title: 'Sewa tenda kegiatan bakti kesehatan', requesterKey: 'rina', cluster: 'HCRC', category: 'general', stageKey: 'deputy', daysInStage: 2, status: 'running' },
  { code: 'PJU-2609-012', title: 'Perbaikan pintu ruang penyimpanan spesimen', requesterKey: 'andi', cluster: 'MedTech', category: 'general', stageKey: 'director', daysInStage: 3, status: 'running' },
  { code: 'PJK-2609-002', title: 'Konsumsi rapat koordinasi peneliti', requesterKey: 'rina', cluster: 'HCRC', category: 'finance', stageKey: 'done', daysInStage: 0, status: 'done' },
  { code: 'PJP-2609-005', title: 'Mutasi internal staf laboratorium', requesterKey: 'dimas', cluster: 'DrugDevelopment', category: 'personnel', stageKey: 'done', daysInStage: 0, status: 'done' },
  { code: 'PJK-2608-088', title: 'Pengadaan freezer penyimpanan −80°C', requesterKey: 'andi', cluster: 'MedTech', category: 'finance', stageKey: 'done', daysInStage: 0, status: 'done' },
  { code: 'PJP-2608-091', title: 'Perpanjangan kontrak tenaga alih daya', requesterKey: 'lestari', cluster: 'StemCell', category: 'personnel', stageKey: 'done', daysInStage: 0, status: 'done' },
  { code: 'PJU-2608-094', title: 'Pengecatan ulang koridor laboratorium', requesterKey: 'rina', cluster: 'HCRC', category: 'general', stageKey: 'done', daysInStage: 0, status: 'done' },
]

async function upsertUser(user: SeedUser, passwordHash: string): Promise<string> {
  const row = await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      email: user.email,
      passwordHash,
      name: user.name,
      type: user.type,
      position: user.position,
      initials: user.initials,
      ...(user.category === undefined ? {} : { category: user.category }),
      ...(user.cluster === undefined ? {} : { cluster: user.cluster }),
    },
  })
  return row.id
}

/**
 * Creates one submission with history consistent with the stage it stopped
 * at: a `submit` entry always, and — for returned submissions — a `return`
 * entry whose id the checklist rows hang off (`historyEntryId`), so a later
 * task's "active checklist" derivation, which looks at the most recent
 * return entry, finds them.
 *
 * `stageEnteredAt` is backdated by `daysInStage - 1` days so the derived day
 * count on screen (`daysSince`) reproduces the prototype's "hari n/m" label.
 * Day one is the day the document arrived at its current stage, hence -1.
 */
async function createSubmission(
  input: SeedSubmission,
  ids: ReadonlyMap<string, string>,
  names: ReadonlyMap<string, { readonly name: string; readonly position: string }>,
): Promise<void> {
  const existing = await prisma.submission.findUnique({ where: { code: input.code } })
  if (existing) return

  const requesterId = ids.get(input.requesterKey)
  const secretaryKey = ROUTE[input.category]
  const secretaryId = ids.get(secretaryKey)
  if (!requesterId || !secretaryId) {
    throw new Error(`Seed data error: missing user for submission ${input.code}`)
  }

  const daysAgo = Math.max(input.daysInStage, 1) - 1
  const stageEnteredAt = new Date(Date.now() - daysAgo * MS_PER_DAY)

  const submission = await prisma.submission.create({
    data: {
      code: input.code,
      title: input.title,
      requesterId,
      assignedSecretaryId: secretaryId,
      cluster: input.cluster,
      category: input.category,
      stageKey: input.stageKey,
      status: input.status,
      stageEnteredAt,
    },
  })

  const requester = names.get(input.requesterKey)
  if (!requester) throw new Error(`Seed data error: unknown requester ${input.requesterKey}`)

  await prisma.historyEntry.create({
    data: {
      submissionId: submission.id,
      actorId: requesterId,
      actorName: requester.name,
      actorPosition: 'Pengaju',
      kind: 'submit',
      action: 'mengirim pengajuan',
      fromStage: 'submitter',
      toStage: 'secretary',
    },
  })

  if (input.status === 'returned' && input.checklist && input.checklist.length > 0) {
    const secretary = names.get(secretaryKey)
    if (!secretary) throw new Error(`Seed data error: unknown secretary ${secretaryKey}`)

    const returnEntry = await prisma.historyEntry.create({
      data: {
        submissionId: submission.id,
        actorId: secretaryId,
        actorName: secretary.name,
        actorPosition: secretary.position,
        kind: 'return',
        action: 'mengembalikan ke pengaju',
        comment: `${input.checklist.map((item) => item.text).join('. ')}.`,
        fromStage: 'secretary',
        toStage: 'submitter',
      },
    })

    await prisma.checklistItem.createMany({
      data: input.checklist.map((item) => ({
        historyEntryId: returnEntry.id,
        submissionId: submission.id,
        text: item.text,
        done: item.done,
      })),
    })
  }
}

export async function seed(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Refusing to seed in production: this creates accounts with a known password')
  }

  const passwordHash = await hashPassword(DEV_PASSWORD)
  const ids = new Map<string, string>()
  const names = new Map<string, { readonly name: string; readonly position: string }>()

  for (const user of USERS) {
    const id = await upsertUser(user, passwordHash)
    ids.set(user.key, id)
    names.set(user.key, { name: user.name, position: user.position })
  }

  const adminId = ids.get('yoga')
  if (!adminId) throw new Error('Seed data error: admin user not created')

  for (const [stageKey, slaDays] of Object.entries(SLA) as ReadonlyArray<[StageKeyValue, number | null]>) {
    await prisma.stageRule.upsert({
      where: { stageKey },
      update: {},
      create: { stageKey, slaDays, updatedById: adminId },
    })
  }

  for (const [category, secretaryKey] of Object.entries(ROUTE) as ReadonlyArray<[CategoryValue, string]>) {
    const secretaryId = ids.get(secretaryKey)
    if (!secretaryId) throw new Error(`Seed data error: missing secretary ${secretaryKey}`)
    await prisma.categoryRoute.upsert({
      where: { category },
      update: {},
      create: { category, secretaryId, updatedById: adminId },
    })
  }

  for (const submission of SUBMISSIONS) {
    await createSubmission(submission, ids, names)
  }

  console.log(`Seed selesai. Password semua akun: ${DEV_PASSWORD}`)
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}
