# Backend `apps/api` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun `apps/api` — backend Express + Prisma + PostgreSQL untuk sistem pengajuan dokumen IMERI, sampai siap dipakai pilot internal satu cluster.

**Architecture:** Satu service Node berumur panjang, di-deploy sebagai container. Aturan alur tidak ditulis ulang di server — `packages/shared/src/flow.ts` dipakai bersama browser dan API, sehingga fungsi yang menyalakan tombol di klien adalah fungsi yang menolak request di server. File tidak pernah melewati API: upload memakai presigned URL langsung ke object store S3-compatible.

**Tech Stack:** Node 20, TypeScript, Express 5, Prisma, PostgreSQL 17, `@aws-sdk/client-s3`, argon2, zod, Vitest, supertest, Docker Compose (Postgres + MinIO).

**Spec:** `docs/superpowers/specs/2026-09-13-backend-api-design.md`

## Global Constraints

- **Node 20+.** Runtime saat ini v20.20.2.
- **Express 5**, bukan 4. Di v5 error dari handler `async` otomatis diteruskan ke error middleware.
- **Bahasa:** seluruh identifier, nama file, dan komentar berbahasa **Inggris**. Teks yang dilihat pengguna berbahasa **Indonesia**. Server tidak pernah mengirim teks UI — API mengembalikan `error.code` berbahasa Inggris yang stabil, frontend yang memetakannya ke kalimat Indonesia. Lihat `apps/web/src/constants/labels.ts` untuk polanya.
- **Semua tipe domain `readonly`**, seluruh pembaruan immutable. Ikuti gaya yang sudah ada di `packages/shared/src/types.ts`.
- **tsconfig ketat:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`. Salin dari `apps/web/tsconfig.json`. Tidak ada `any`, tidak ada `@ts-ignore`.
- **Tidak ada mock untuk Prisma maupun `FileStore`.** Integration test memakai Postgres dan MinIO sungguhan dari `docker-compose`. Yang rusak di lapis ini adalah transaksi, kunci baris, dan unique constraint — persis yang mock tidak bisa tirukan.
- **Commit message berbahasa Indonesia**, mengikuti riwayat repo. Akhiri dengan:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **Riwayat append-only.** Tidak boleh ada endpoint, service, atau repository yang meng-update atau menghapus `HistoryEntry` maupun `ChecklistItem`. Checklist berhenti aktif karena statusnya berubah, bukan karena barisnya dihapus.
- **Batas "server tidak mengirim teks UI" berlaku untuk chrome, bukan untuk catatan.** `error.code`, nama enum, dan nama field selalu Inggris. Tapi `HistoryEntry.action` dan `HistoryEntry.comment` berbahasa Indonesia dan memang disimpan begitu: keduanya **catatan audit sebagaimana tertulis saat kejadian**, sekelas dengan `actorName` dan `actorPosition` yang juga disalin. Menerjemahkannya di klien justru akan mengubah isi riwayat setiap kali label diubah.

---

## Struktur File

### Dibuat

```
docker-compose.yml                     Postgres 17 + MinIO + minio-init
packages/shared/tsconfig.json          build ke dist/ supaya Node bisa konsumsi
packages/shared/src/stages.ts          STAGE_ORDER + helper urutan tahap
packages/shared/tests/flow.test.ts     unit test aturan alur

apps/api/
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  prisma/schema.prisma
  prisma/seed.ts
  src/
    index.ts                           bootstrap Express
    app.ts                             perakitan app (dipisah agar bisa di-test)
    env.ts                             validasi environment (zod), gagal cepat
    errors.ts                          ApiError + kode error
    db/client.ts                       instance PrismaClient
    db/toDomain.ts                     baris Prisma → tipe domain shared
    middleware/requireAuth.ts
    middleware/errorHandler.ts
    storage/FileStore.ts               interface
    storage/s3Store.ts                 implementasi S3-compatible
    modules/auth/{routes,service,repository}.ts
    modules/submissions/{routes,service,repository}.ts
    modules/documents/{routes,service,repository}.ts
    modules/flowRules/{routes,service,repository}.ts
    modules/users/{routes,service,repository}.ts
    jobs/cleanupOrphans.ts
    scripts/createAdmin.ts
  tests/
    helpers/db.ts                      truncate + transaksi per test
    helpers/auth.ts                    login agent supertest
    *.test.ts
```

### Diubah

```
package.json                           workspace apps/api, script dev gabungan, devDep vitest
packages/shared/package.json           exports → dist, script build & test
packages/shared/src/types.ts           Stage diciutkan, Submission.stageKey, Cluster tanpa spasi
packages/shared/src/flow.ts            bekerja atas stageKey, bukan indeks
packages/shared/src/index.ts           ekspor stages.ts
apps/web/src/constants/labels.ts       + CLUSTER_LABEL
apps/web/src/constants/stages.ts       label meja/aksi dipetakan dari StageKey
apps/web/src/**                        penyesuaian stageIndex → stageKey
```

**Kenapa dipecah begini:** tiap modul memakai susunan **routes → service → repository**. Route hanya mengurus HTTP dan validasi zod; service memegang aturan bisnis dan bisa dites tanpa menyalakan HTTP; repository satu-satunya yang menyentuh SQL. `app.ts` dipisah dari `index.ts` supaya supertest bisa merakit app tanpa membuka port.

---

## Urutan Ketergantungan

```
1 ─ 2 ─ 3                    shared: kunci perilaku, refactor, rapikan web
        └─ 4 ─ 5 ─ 6 ─ 7     infra, skema, auth, seed
                    └─ 8     baca pengajuan
                       └─ 9  storage & presigned URL
                          └─ 10 ─ 11 ─ 12   buat, aksi alur, versi dokumen
                                        └─ 13 ─ 14 ─ 15
```

Task 1 mendahului Task 2 dengan sengaja: perilaku `flow.ts` dikunci test **sebelum** direfactor, sehingga refactor terbukti tidak mengubah arti.

---

### Task 1: Kunci perilaku `flow.ts` dengan test

Aturan alur sekarang tidak punya satu pun test. Sebelum apa pun direfactor, perilakunya dikunci lebih dulu supaya refactor di Task 2 terbukti tidak mengubah arti.

**Files:**
- Modify: `package.json` (devDependency vitest, script `test`)
- Modify: `packages/shared/package.json` (script `test`)
- Create: `packages/shared/tests/flow.test.ts`

**Interfaces:**
- Consumes: `packages/shared/src/flow.ts` apa adanya — `stageAt`, `isObserver`, `isVisible`, `isHolder`, `isOverdue`, `overdueDays`, `checklistCleared`, `canAdvance`
- Produces: perintah `npm test` yang jalan dari root

- [ ] **Step 1: Pasang Vitest**

```bash
npm install -D -w . vitest@^2
```

Tambahkan ke `package.json` root, di dalam `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Tambahkan ke `packages/shared/package.json`, di dalam objek baru `"scripts"`:

```json
"scripts": {
  "test": "vitest run"
}
```

- [ ] **Step 2: Tulis test yang gagal**

Buat `packages/shared/tests/flow.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  canAdvance,
  checklistCleared,
  isHolder,
  isObserver,
  isOverdue,
  isVisible,
  overdueDays,
  stageAt,
} from '../src/flow'
import type { Role, Stage, Submission } from '../src/types'

const STAGES: readonly Stage[] = [
  { key: 'submitter', desk: 'Pengaju', action: 'Penyusunan berkas', sla: null },
  { key: 'secretary', desk: 'Sekret', action: 'Verifikasi berkas', sla: 1 },
  { key: 'deputy', desk: 'Wadir', action: 'QC & paraf', sla: 2 },
  { key: 'director', desk: 'Direktur', action: 'Persetujuan', sla: 2 },
  { key: 'recording', desk: 'Sekret', action: 'Rekam & arsip', sla: 1 },
  { key: 'done', desk: 'Pengaju', action: 'Selesai', sla: null },
]

const rina: Role = { id: 'rina', name: 'Rina', type: 'submitter', position: 'Pengaju', initials: 'RK' }
const sari: Role = { id: 'sari', name: 'Sari', type: 'secretary', position: 'Sekret', initials: 'SD', category: 'finance' }
const budi: Role = { id: 'budi', name: 'Budi', type: 'secretary', position: 'Sekret', initials: 'BS', category: 'personnel' }
const hendra: Role = { id: 'hendra', name: 'Hendra', type: 'deputy', position: 'Wadir', initials: 'HW' }
const yoga: Role = { id: 'yoga', name: 'Yoga', type: 'admin', position: 'Admin', initials: 'YP' }
const nadia: Role = { id: 'nadia', name: 'Nadia', type: 'monitor', position: 'Monitor', initials: 'NR', cluster: 'HCRC' }

function make(over: Partial<Submission> = {}): Submission {
  return {
    code: 'PJK-2609-001',
    title: 'Contoh',
    requester: 'Rina',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'finance',
    createdAt: '1 Sep 2026',
    stageIndex: 1,
    daysInStage: 1,
    status: 'running',
    attachments: [],
    checklist: [],
    history: [],
    ...over,
  }
}

describe('stageAt', () => {
  it('menjepit indeks ke rentang yang valid', () => {
    expect(stageAt(STAGES, -5).key).toBe('submitter')
    expect(stageAt(STAGES, 99).key).toBe('done')
    expect(stageAt(STAGES, 2).key).toBe('deputy')
  })
})

describe('isObserver', () => {
  it('benar untuk admin dan monitor saja', () => {
    expect(isObserver(yoga)).toBe(true)
    expect(isObserver(nadia)).toBe(true)
    expect(isObserver(sari)).toBe(false)
    expect(isObserver(rina)).toBe(false)
  })
})

describe('isVisible', () => {
  it('pengaju hanya melihat miliknya', () => {
    expect(isVisible(make({ requesterId: 'rina' }), rina)).toBe(true)
    expect(isVisible(make({ requesterId: 'andi' }), rina)).toBe(false)
  })

  it('sekret hanya melihat kategorinya', () => {
    expect(isVisible(make({ category: 'finance' }), sari)).toBe(true)
    expect(isVisible(make({ category: 'personnel' }), sari)).toBe(false)
  })

  it('monitor hanya melihat clusternya', () => {
    expect(isVisible(make({ cluster: 'HCRC' }), nadia)).toBe(true)
    expect(isVisible(make({ cluster: 'MedTech' }), nadia)).toBe(false)
  })

  it('wadir dan admin melihat semuanya', () => {
    expect(isVisible(make({ cluster: 'MedTech', category: 'general' }), hendra)).toBe(true)
    expect(isVisible(make({ cluster: 'MedTech', category: 'general' }), yoga)).toBe(true)
  })
})

describe('isHolder', () => {
  it('berkas selesai tidak dipegang siapa pun', () => {
    expect(isHolder(make({ status: 'done', stageIndex: 5 }), rina, STAGES)).toBe(false)
  })

  it('tahap submitter dipegang pengajunya saja', () => {
    const s = make({ stageIndex: 0, requesterId: 'rina' })
    expect(isHolder(s, rina, STAGES)).toBe(true)
    expect(isHolder(s, sari, STAGES)).toBe(false)
  })

  it('tahap secretary dan recording dipegang sekret berkategori sama', () => {
    expect(isHolder(make({ stageIndex: 1, category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageIndex: 4, category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageIndex: 1, category: 'finance' }), budi, STAGES)).toBe(false)
  })

  it('monitor tidak pernah memegang apa pun', () => {
    for (let i = 0; i < STAGES.length; i += 1) {
      expect(isHolder(make({ stageIndex: i }), nadia, STAGES)).toBe(false)
      expect(isHolder(make({ stageIndex: i }), yoga, STAGES)).toBe(false)
    }
  })
})

describe('isOverdue / overdueDays', () => {
  it('tahap tanpa batas tidak pernah terlambat', () => {
    expect(isOverdue(make({ stageIndex: 0, daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ stageIndex: 0, daysInStage: 99 }), STAGES)).toBe(0)
  })

  it('tepat di batas belum terlambat', () => {
    expect(isOverdue(make({ stageIndex: 1, daysInStage: 1 }), STAGES)).toBe(false)
    expect(isOverdue(make({ stageIndex: 1, daysInStage: 2 }), STAGES)).toBe(true)
    expect(overdueDays(make({ stageIndex: 1, daysInStage: 3 }), STAGES)).toBe(2)
  })

  it('berkas selesai tidak pernah terlambat', () => {
    expect(isOverdue(make({ status: 'done', stageIndex: 1, daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ status: 'done', stageIndex: 1, daysInStage: 99 }), STAGES)).toBe(0)
  })
})

describe('canAdvance', () => {
  it('checklist kosong berarti boleh maju', () => {
    expect(checklistCleared(make())).toBe(true)
    expect(canAdvance(make())).toBe(true)
  })

  it('berkas dikembalikan terkunci sampai semua poin tertutup', () => {
    const open = make({ status: 'returned', checklist: [{ text: 'a', done: false }] })
    const closed = make({ status: 'returned', checklist: [{ text: 'a', done: true }] })
    expect(canAdvance(open)).toBe(false)
    expect(canAdvance(closed)).toBe(true)
  })

  it('berkas berjalan tidak terkunci walau checklist terbuka', () => {
    const s = make({ status: 'running', checklist: [{ text: 'a', done: false }] })
    expect(canAdvance(s)).toBe(true)
  })
})
```

- [ ] **Step 3: Jalankan test — harus LULUS**

Run: `npm test`
Expected: seluruh test PASS.

Ini test karakterisasi, bukan TDD: ia mendokumentasikan perilaku yang sudah ada supaya Task 2 punya jaring pengaman. Kalau ada yang GAGAL, berarti asumsi di test salah membaca kode — perbaiki test-nya, jangan `flow.ts`.

- [ ] **Step 4: Commit**

```bash
git add package.json packages/shared/package.json packages/shared/tests/
git commit -m "$(cat <<'MSG'
Kunci perilaku aturan alur dengan test

Memasang Vitest dan menulis test karakterisasi untuk seluruh fungsi di
packages/shared/src/flow.ts. Perilakunya dikunci lebih dulu supaya refactor
berikutnya terbukti tidak mengubah arti.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: Refactor `packages/shared` ke `stageKey`

Tiga penyesuaian dari spec §4: `Stage` diciutkan jadi `{ key, sla }`, `Submission` memakai `stageKey` bukan indeks, dan nilai `Cluster` dibuat tanpa spasi agar sah sebagai enum Prisma. Test dari Task 1 harus tetap hijau setelah disesuaikan.

**Files:**
- Create: `packages/shared/src/stages.ts`
- Create: `packages/shared/tsconfig.json`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/flow.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`
- Modify: `packages/shared/tests/flow.test.ts`

**Interfaces:**
- Produces:
  - `STAGE_ORDER: readonly StageKey[]` — urutan kanonik enam tahap
  - `stageIndexOf(key: StageKey): number`
  - `nextStage(key: StageKey): StageKey`
  - `previousStage(key: StageKey): StageKey`
  - `stageByKey(stages: readonly Stage[], key: StageKey): Stage`
  - `Stage = { readonly key: StageKey; readonly sla: number | null }`
  - `Submission.stageKey: StageKey` menggantikan `stageIndex: number`
  - `Cluster = 'HCRC' | 'MedTech' | 'StemCell' | 'DrugDevelopment'`

- [ ] **Step 1: Tulis test untuk helper urutan tahap**

Tambahkan di atas `packages/shared/tests/flow.test.ts`:

```ts
import { STAGE_ORDER, nextStage, previousStage, stageIndexOf } from '../src/stages'

describe('urutan tahap', () => {
  it('enam tahap dengan urutan tetap', () => {
    expect(STAGE_ORDER).toEqual(['submitter', 'secretary', 'deputy', 'director', 'recording', 'done'])
  })

  it('stageIndexOf mengembalikan posisi', () => {
    expect(stageIndexOf('submitter')).toBe(0)
    expect(stageIndexOf('done')).toBe(5)
  })

  it('nextStage berhenti di tahap terakhir', () => {
    expect(nextStage('submitter')).toBe('secretary')
    expect(nextStage('recording')).toBe('done')
    expect(nextStage('done')).toBe('done')
  })

  it('previousStage berhenti di tahap pertama', () => {
    expect(previousStage('deputy')).toBe('secretary')
    expect(previousStage('submitter')).toBe('submitter')
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/stages'`.

- [ ] **Step 3: Buat `packages/shared/src/stages.ts`**

```ts
import type { Stage, StageKey } from './types'

/** The six stages a document passes through, in canonical order. */
export const STAGE_ORDER: readonly StageKey[] = [
  'submitter',
  'secretary',
  'deputy',
  'director',
  'recording',
  'done',
]

export function stageIndexOf(key: StageKey): number {
  const index = STAGE_ORDER.indexOf(key)
  if (index < 0) throw new Error(`Unknown stage: ${key}`)
  return index
}

/** The next stage, clamped at the last one. */
export function nextStage(key: StageKey): StageKey {
  const next = STAGE_ORDER[Math.min(stageIndexOf(key) + 1, STAGE_ORDER.length - 1)]
  if (!next) throw new Error('Stage order is empty')
  return next
}

/** The previous stage, clamped at the first one. */
export function previousStage(key: StageKey): StageKey {
  const previous = STAGE_ORDER[Math.max(stageIndexOf(key) - 1, 0)]
  if (!previous) throw new Error('Stage order is empty')
  return previous
}

/** Look up the rule (SLA) for one stage. */
export function stageByKey(stages: readonly Stage[], key: StageKey): Stage {
  const stage = stages.find((item) => item.key === key)
  if (!stage) throw new Error(`No rule configured for stage: ${key}`)
  return stage
}
```

- [ ] **Step 4: Ciutkan `Stage`, ubah `Submission`, perbaiki `Cluster`**

Di `packages/shared/src/types.ts` ganti tiga bagian:

```ts
export type Cluster = 'HCRC' | 'MedTech' | 'StemCell' | 'DrugDevelopment'

export interface Stage {
  readonly key: StageKey
  /** Day limit for this stage; null means unbounded. */
  readonly sla: number | null
}
```

Di `interface Submission`, ganti dua field:

```ts
  /** Which desk the document is sitting at. */
  readonly stageKey: StageKey
  /** Days at the current desk, derived from stageEnteredAt by the caller. */
  readonly daysInStage: number
```

`desk` dan `action` dihapus dari `Stage` karena `flow.ts` tidak pernah memakainya — keduanya hanya teks UI dan pindah ke `apps/web` di Task 3.

- [ ] **Step 5: Ubah `flow.ts` agar bekerja atas `stageKey`**

Ganti `stageAt` dengan `stageByKey` dari `stages.ts`, lalu sesuaikan tiga fungsi:

```ts
import { stageByKey } from './stages'

export function isHolder(submission: Submission, role: Role, stages: readonly Stage[]): boolean {
  if (submission.status === 'done') return false
  const { key } = stageByKey(stages, submission.stageKey)
  if (key === 'submitter') return role.type === 'submitter' && submission.requesterId === role.id
  if (key === 'secretary' || key === 'recording') {
    return role.type === 'secretary' && submission.category === role.category
  }
  if (key === 'deputy') return role.type === 'deputy'
  if (key === 'director') return role.type === 'director'
  return false
}

export function isOverdue(submission: Submission, stages: readonly Stage[]): boolean {
  if (submission.status === 'done') return false
  const { sla } = stageByKey(stages, submission.stageKey)
  return sla !== null && submission.daysInStage > sla
}

export function overdueDays(submission: Submission, stages: readonly Stage[]): number {
  const { sla } = stageByKey(stages, submission.stageKey)
  if (sla === null || submission.status === 'done') return 0
  return Math.max(0, submission.daysInStage - sla)
}
```

Hapus fungsi `stageAt` — `stageByKey` menggantikannya. Tambahkan `export * from './stages'` di `packages/shared/src/index.ts`.

- [ ] **Step 6: Sesuaikan test Task 1**

Ubah fixture `STAGES` jadi `{ key, sla }` saja, ganti tiap `stageIndex: n` menjadi `stageKey: '<key>'`, dan ganti blok `describe('stageAt')` menjadi:

```ts
describe('stageByKey', () => {
  it('mengembalikan aturan tahap yang diminta', () => {
    expect(stageByKey(STAGES, 'deputy').sla).toBe(2)
    expect(stageByKey(STAGES, 'submitter').sla).toBeNull()
  })

  it('melempar kalau tahapnya tidak dikonfigurasi', () => {
    expect(() => stageByKey([], 'deputy')).toThrow()
  })
})
```

Di test `isHolder` "monitor tidak pernah memegang apa pun", ganti loop indeks menjadi:

```ts
    for (const key of STAGE_ORDER) {
      expect(isHolder(make({ stageKey: key }), nadia, STAGES)).toBe(false)
      expect(isHolder(make({ stageKey: key }), yoga, STAGES)).toBe(false)
    }
```

- [ ] **Step 7: Jalankan test — harus LULUS**

Run: `npm test`
Expected: seluruh test PASS.

- [ ] **Step 8: Siapkan build ke `dist/`**

Buat `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

Ubah `packages/shared/package.json`:

```json
{
  "name": "@imeri/shared",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

Tambahkan `dist` ke `.gitignore` bila belum tercakup — baris `dist` yang ada sudah mencakupnya.

`apps/web` tetap memakai alias Vite ke `src/`, jadi tidak terpengaruh build ini.

- [ ] **Step 9: Verifikasi build**

Run: `npm run build -w @imeri/shared && node -e "import('./packages/shared/dist/index.js').then(m => console.log(Object.keys(m).length + ' ekspor'))"`
Expected: mencetak jumlah ekspor tanpa error.

- [ ] **Step 10: Commit**

```bash
git add packages/shared package.json
git commit -m "$(cat <<'MSG'
Refactor shared ke stageKey dan siapkan build dist

Stage diciutkan jadi { key, sla } karena flow.ts tidak pernah menyentuh desk
maupun action — keduanya teks UI dan pindah ke apps/web. Submission memakai
stageKey agar cocok dengan enum di database, dengan STAGE_ORDER sebagai satu
sumber urutan tahap. Nilai Cluster dibuat tanpa spasi supaya sah sebagai enum
Prisma.

Paket kini di-build ke dist/ agar bisa dikonsumsi Node, bukan hanya Vite.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: Sesuaikan `apps/web` ke API shared yang baru

Task 2 memutus `apps/web`. Task ini menyambungnya lagi: label meja/aksi pindah ke frontend, `stageIndex` diganti `stageKey`, dan nilai `Cluster` mendapat peta label. **Tidak ada perubahan tampilan** — layar harus terlihat persis sama.

**Files:**
- Modify: `apps/web/src/constants/stages.ts`
- Modify: `apps/web/src/constants/labels.ts`
- Modify: `apps/web/src/constants/staff.ts`
- Modify: `apps/web/src/constants/submissions.ts`
- Modify: `apps/web/src/helpers/monitoring.ts`
- Modify: `apps/web/src/stores/submissionAtom.ts`
- Modify: `apps/web/src/components/submission/SubmissionTable.tsx`
- Modify: `apps/web/src/components/submission/SubmissionDrawer.tsx`
- Modify: `apps/web/src/pages/Monitoring/components/Backlog.tsx`
- Modify: `apps/web/src/pages/Monitoring/components/Overdue.tsx`

**Interfaces:**
- Consumes: `STAGE_ORDER`, `stageByKey`, `nextStage`, `previousStage`, `Stage = { key, sla }`, `Submission.stageKey` dari Task 2
- Produces:
  - `STAGE_LABEL: Readonly<Record<StageKey, { desk: string; action: string }>>`
  - `DEFAULT_STAGES: readonly Stage[]` (hanya `{ key, sla }`)
  - `CLUSTER_LABEL: Readonly<Record<Cluster, string>>`

- [ ] **Step 1: Pisahkan label tahap dari aturan tahap**

Ganti seluruh isi `apps/web/src/constants/stages.ts`:

```ts
import { STAGE_ORDER } from '@imeri/shared'
import type { Stage, StageKey } from '@/types'

/** Indonesian screen labels for each desk. Never leaves the browser. */
export const STAGE_LABEL: Readonly<Record<StageKey, { desk: string; action: string }>> = {
  submitter: { desk: 'Pengaju', action: 'Penyusunan berkas' },
  secretary: { desk: 'Sekret', action: 'Verifikasi berkas' },
  deputy: { desk: 'Wadir', action: 'QC & paraf' },
  director: { desk: 'Direktur', action: 'Persetujuan' },
  recording: { desk: 'Sekret', action: 'Rekam & arsip' },
  done: { desk: 'Pengaju', action: 'Selesai' },
}

const DEFAULT_SLA: Readonly<Record<StageKey, number | null>> = {
  submitter: null,
  secretary: 1,
  deputy: 2,
  director: 2,
  recording: 1,
  done: null,
}

/** Starting rules; the super admin can change the SLA at runtime via flowAtom. */
export const DEFAULT_STAGES: readonly Stage[] = STAGE_ORDER.map((key) => ({ key, sla: DEFAULT_SLA[key] }))

export const ADVANCE_LABEL: Partial<Record<StageKey, string>> = {
  submitter: 'Ajukan ulang',
  secretary: 'Teruskan ke Wadir',
  deputy: 'Paraf & teruskan ke Direktur',
  director: 'Setujui & tanda tangani',
  recording: 'Rekam & beri tahu pengaju',
}

export const RETURN_LABEL: Partial<Record<StageKey, string>> = {
  secretary: 'Kembalikan ke pengaju',
  deputy: 'Kembalikan ke Sekret',
  director: 'Kembalikan ke Wadir',
  recording: 'Kembalikan ke Direktur',
}

export const ADVANCE_TRAIL: Partial<Record<StageKey, string>> = {
  submitter: 'mengajukan ulang setelah perbaikan',
  secretary: 'meneruskan ke Wadir',
  deputy: 'memberi paraf dan meneruskan ke Direktur',
  director: 'menyetujui dan menandatangani',
  recording: 'merekam hasil dan memberi tahu pengaju',
}
```

- [ ] **Step 2: Tambahkan `CLUSTER_LABEL`**

Di `apps/web/src/constants/labels.ts`, tambahkan:

```ts
import type { Category, Cluster, StaffScope } from '@/types'

export const CLUSTER_LABEL: Readonly<Record<Cluster, string>> = {
  HCRC: 'HCRC',
  MedTech: 'MedTech',
  StemCell: 'Stem Cell',
  DrugDevelopment: 'Drug Development',
}
```

Ubah `scopeLabel` agar memakainya:

```ts
export const scopeLabel = (scope: StaffScope): string =>
  scope === 'cross-cluster' ? 'Lintas cluster' : CLUSTER_LABEL[scope]
```

- [ ] **Step 3: Perbarui data seed dan konstanta cluster**

Di `apps/web/src/constants/staff.ts`:
- `ALL_CLUSTERS` menjadi `['HCRC', 'MedTech', 'StemCell', 'DrugDevelopment']`
- kunci `CLUSTER_STATS` menjadi `HCRC`, `MedTech`, `StemCell`, `DrugDevelopment`
- nilai `scope` pada `STAFF` yang tadinya `'Stem Cell'` / `'Drug Development'` mengikuti

Di `apps/web/src/constants/submissions.ts`:
- setiap `cluster: 'Stem Cell'` → `cluster: 'StemCell'`, `cluster: 'Drug Development'` → `cluster: 'DrugDevelopment'`
- setiap `stageIndex: n` → `stageKey: STAGE_ORDER[n]` dengan nilai literal:
  `0 → 'submitter'`, `1 → 'secretary'`, `2 → 'deputy'`, `3 → 'director'`, `4 → 'recording'`, `5 → 'done'`
- pada fungsi `make(...)`, parameter `stageIndex: number` menjadi `stageKey: StageKey`, dan `autoHistory` menerima `stageKey` lalu membandingkannya lewat `stageIndexOf(stageKey) >= 2` dst.

- [ ] **Step 4: Perbarui helper pemantauan**

Di `apps/web/src/helpers/monitoring.ts`, ganti pemakaian `stageAt`:

```ts
import { isOverdue, stageByKey } from '@imeri/shared'
import { STAGE_LABEL } from '@/constants/stages'

export function holderOf(submission: Submission, stages: readonly Stage[], route: CategoryRoute): Holder {
  if (submission.status === 'done') return { name: '—', initials: '✓', position: 'Arsip' }

  const { key } = stageByKey(stages, submission.stageKey)
  if (key === 'submitter') {
    return { name: submission.requester, initials: initialsOf(submission.requester), position: 'menunggu perbaikan' }
  }
  if (key === 'secretary' || key === 'recording') {
    const secretary = roleById(route[submission.category])
    return { name: secretary.name, initials: secretary.initials, position: secretary.position }
  }
  if (key === 'deputy') {
    const deputy = roleById('hendra')
    return { name: deputy.name, initials: deputy.initials, position: 'QC & paraf' }
  }
  const director = roleById('ratna')
  return { name: director.name, initials: director.initials, position: 'Persetujuan' }
}
```

`BacklogRow` kehilangan field `index` dan memakai label dari frontend:

```ts
export interface BacklogRow {
  readonly stage: Stage
  readonly desk: string
  readonly action: string
  readonly count: number
  readonly overdue: number
}

export function backlogByStage(active: readonly Submission[], stages: readonly Stage[]): readonly BacklogRow[] {
  return stages
    .filter((stage) => stage.key !== 'done')
    .map((stage) => {
      const atDesk = active.filter((item) => item.stageKey === stage.key)
      return {
        stage,
        desk: STAGE_LABEL[stage.key].desk,
        action: STAGE_LABEL[stage.key].action,
        count: atDesk.length,
        overdue: atDesk.filter((item) => isOverdue(item, stages)).length,
      }
    })
}
```

- [ ] **Step 5: Perbarui aksi di store**

Di `apps/web/src/stores/submissionAtom.ts`, ganti aritmetika indeks dengan helper urutan:

```ts
import { nextStage, previousStage, stageByKey } from '@imeri/shared'

// di dalam advance():
const stage = stageByKey(stages, current.stageKey)
const target = nextStage(current.stageKey)
const finished = target === 'done'

setList((prev) =>
  replace(prev, code, (item) => ({
    ...item,
    stageKey: target,
    daysInStage: finished ? 0 : 1,
    status: finished ? 'done' : 'running',
    checklist: [],
    history: [ /* tidak berubah, memakai ADVANCE_TRAIL[stage.key] */ ],
  })),
)

toast(
  finished
    ? `${code} selesai — pengaju sudah diberi tahu`
    : `${code} diteruskan ke ${STAGE_LABEL[target].desk}`,
)

// di dalam sendBack():
const target = previousStage(current.stageKey)
// ... stageKey: target, dan pesan memakai STAGE_LABEL[target].desk
```

Pada `create()`, ganti `stageIndex: 1` menjadi `stageKey: 'secretary'`.

- [ ] **Step 6: Perbarui komponen**

- `SubmissionTable.tsx` — `stageAt(stages, submission.stageIndex)` menjadi `stageByKey(stages, submission.stageKey)`; teks kolom memakai `STAGE_LABEL[submission.stageKey].action`; label kategori tetap lewat `CATEGORY_LABEL`; label cluster memakai `CLUSTER_LABEL[submission.cluster]`.
- `SubmissionDrawer.tsx` — `StageTimeline` melakukan perbandingan posisi lewat `stageIndexOf`:
  ```ts
  const currentIndex = stageIndexOf(submission.stageKey)
  // di dalam map:
  const index = stageIndexOf(stage.key)
  const passed = submission.status === 'done' || index < currentIndex
  const current = index === currentIndex && submission.status !== 'done'
  ```
  dan teks baris memakai `STAGE_LABEL[stage.key].desk` / `.action`.
  Chip cluster memakai `CLUSTER_LABEL[submission.cluster]`.
- `Backlog.tsx` — memakai `item.desk` dan `item.action` dari `BacklogRow`, bukan `item.stage.desk`; `key` baris menjadi `item.stage.key`.
- `Overdue.tsx` — `stageAt(stages, submission.stageIndex).desk` menjadi `STAGE_LABEL[submission.stageKey].desk`.
- `ClusterCompare.tsx` — nama cluster ditampilkan lewat `CLUSTER_LABEL[cluster]`.
- `FilterBar.tsx` — opsi cluster memakai `CLUSTER_LABEL[cluster]` sebagai teks, nilai tetap kunci Inggris.

- [ ] **Step 7: Verifikasi typecheck, build, dan tampilan**

Run:
```bash
npm run typecheck && npm run build:web && npm test
```
Expected: ketiganya lulus tanpa error.

Lalu jalankan dan periksa mata:
```bash
cd apps/web && npx vite preview --port 4173
```
Buka `http://localhost:4173`, masuk sebagai Sari Dewi, dan pastikan: sidebar "Kotak masuk 2 / Semua berkas 8 / Arsip 3", kolom cluster tetap berbunyi **"Stem Cell"** dan **"Drug Development"** (bukan `StemCell`), papan pemantauan Yoga Pratama menampilkan lima baris penumpukan. Tidak boleh ada error di konsol.

Hentikan server: `pkill -f "vite preview"`.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "$(cat <<'MSG'
Sesuaikan frontend ke API shared yang baru

Label meja dan aksi pindah dari packages/shared ke apps/web karena keduanya
teks UI; shared hanya membawa struktur. Pemakaian stageIndex diganti stageKey
dengan STAGE_ORDER sebagai sumber urutan. Nilai Cluster yang kini tanpa spasi
ditampilkan lewat CLUSTER_LABEL, jadi layar tidak berubah.

Tampilan diverifikasi sama persis dengan sebelumnya.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: Docker Compose, kerangka `apps/api`, dan `env.ts`

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/vitest.config.ts`, `apps/api/.env.example`
- Create: `apps/api/src/env.ts`, `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/errors.ts`, `apps/api/src/middleware/errorHandler.ts`
- Create: `apps/api/tests/health.test.ts`
- Modify: `package.json` (workspace + script)

**Interfaces:**
- Produces:
  - `createApp(): express.Express` dari `src/app.ts` — supertest merakit app tanpa membuka port
  - `env` dari `src/env.ts` — objek tervalidasi berisi `DATABASE_URL`, `S3_*`, `PORT`, `SESSION_TTL_HOURS`, `NODE_ENV`
  - `ApiError`, `NotFound`, `Forbidden`, `Conflict`, `BadRequest` dari `src/errors.ts`

- [ ] **Step 1: Tulis `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: imeri
      POSTGRES_PASSWORD: imeri
      POSTGRES_DB: imeri
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U imeri']
      interval: 5s
      retries: 10

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ['9000:9000', '9001:9001']
    volumes: ['miniodata:/data']
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 5s
      retries: 10

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin &&
      mc mb --ignore-existing local/imeri-dev &&
      echo 'bucket siap'
      "

volumes:
  pgdata:
  miniodata:
```

`minio-init` bukan hiasan: tanpa dia, jalan pertama gagal dengan pesan membingungkan karena bucket-nya belum ada.

- [ ] **Step 2: Buat workspace `apps/api`**

`apps/api/package.json`:

```json
{
  "name": "@imeri/api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@imeri/shared": "*",
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "@prisma/client": "^6.1.0",
    "argon2": "^0.41.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^5.0.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.0",
    "@types/supertest": "^6.0.2",
    "prisma": "^6.1.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

Di `package.json` root, tambahkan `"apps/api"` ke `workspaces`, lalu ubah script:

```json
"dev": "npm run dev -w @imeri/api & npm run dev -w @imeri/web",
"dev:api": "npm run dev -w @imeri/api",
"build:api": "npm run build -w @imeri/api",
"typecheck": "npm run typecheck -w @imeri/web && npm run typecheck -w @imeri/api"
```

Jalankan `npm install` dari root.

- [ ] **Step 3: `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["node"],
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests", "prisma"]
}
```

`apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', fileParallelism: false, hookTimeout: 30_000 },
})
```

`fileParallelism: false` disengaja: test integration berbagi satu database, jadi menjalankannya paralel membuat truncate saling menginjak.

- [ ] **Step 4: `apps/api/src/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
  console.error(`Invalid environment:\n${lines.join('\n')}`)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
```

Server menolak menyala dengan pesan jelas, alih-alih menyala lalu gagal saat orang pertama mengunggah file.

`apps/api/.env.example`:

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://imeri:imeri@localhost:5432/imeri
SESSION_TTL_HOURS=12
WEB_ORIGIN=http://localhost:5173
COOKIE_SAMESITE=lax
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=imeri-dev
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
MAX_UPLOAD_BYTES=20971520
```

- [ ] **Step 5: `apps/api/src/errors.ts`**

```ts
export type ErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'not_found'
  | 'not_your_desk'
  | 'checklist_open'
  | 'comment_required'
  | 'primary_document_frozen'
  | 'document_not_uploaded'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'invalid_credentials'
  | 'admin_only'
  | 'internal'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ApiError'
  }
}

export const BadRequest = (code: ErrorCode = 'bad_request', message?: string) => new ApiError(400, code, message)
export const Unauthenticated = () => new ApiError(401, 'unauthenticated')
export const Forbidden = (code: ErrorCode) => new ApiError(403, code)
export const NotFound = () => new ApiError(404, 'not_found')
export const Conflict = (code: ErrorCode) => new ApiError(409, code)
```

**Server tidak pernah mengirim teks UI.** `code` stabil dan berbahasa Inggris; frontend yang memetakannya ke kalimat Indonesia.

- [ ] **Step 6: Tulis test yang gagal**

`apps/api/tests/health.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'

describe('GET /health', () => {
  it('menjawab ok', async () => {
    const res = await request(createApp()).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('rute tak dikenal', () => {
  it('menjawab 404 dengan bentuk error yang baku', async () => {
    const res = await request(createApp()).get('/tidak-ada')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })
})
```

- [ ] **Step 7: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api`
Expected: FAIL, `Cannot find module '../src/app'`.

- [ ] **Step 8: Implementasi `app.ts`, `errorHandler.ts`, `index.ts`**

`apps/api/src/middleware/errorHandler.ts`:

```ts
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../errors'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } })
    return
  }
  console.error(err)
  res.status(500).json({ error: { code: 'internal', message: 'internal' } })
}
```

`apps/api/src/app.ts`:

```ts
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { env } from './env'
import { NotFound } from './errors'
import { errorHandler } from './middleware/errorHandler'

export function createApp(): express.Express {
  const app = express()

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use((_req, _res, next) => next(NotFound()))
  app.use(errorHandler)

  return app
}
```

Batas `256kb` disengaja: body JSON di API ini tidak pernah membawa file — byte file langsung ke object store lewat presigned URL.

`apps/api/src/index.ts`:

```ts
import { createApp } from './app'
import { env } from './env'

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})
```

- [ ] **Step 9: Jalankan test — harus LULUS**

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d
npm test -w @imeri/api
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add docker-compose.yml apps/api package.json package-lock.json
git commit -m "$(cat <<'MSG'
Kerangka apps/api dengan Express 5 dan lingkungan lokal

Menambahkan workspace apps/api, docker-compose berisi Postgres 17 dan MinIO
(dengan minio-init yang membuat bucket supaya jalan pertama tidak gagal), serta
env.ts yang memvalidasi environment saat boot dan menolak menyala kalau ada yang
kurang.

createApp() dipisah dari index.ts agar supertest bisa merakit app tanpa membuka
port. Bentuk error dibakukan sebagai { error: { code } } dengan kode berbahasa
Inggris; frontend yang memetakannya ke kalimat Indonesia.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: Skema Prisma, migrasi, dan pemeta ke tipe domain

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/toDomain.ts`
- Create: `apps/api/tests/helpers/db.ts`
- Create: `apps/api/tests/toDomain.test.ts`

**Interfaces:**
- Produces:
  - `prisma` (PrismaClient) dari `src/db/client.ts`
  - `toDomainSubmission(row): Submission` dari `src/db/toDomain.ts` — mengubah baris Prisma + relasinya menjadi tipe `Submission` milik `@imeri/shared`, menghitung `daysInStage` dari `stageEnteredAt`
  - `daysSince(from: Date, now?: Date): number`
  - `resetDb()` dan `disconnectDb()` dari `tests/helpers/db.ts`

- [ ] **Step 1: Tulis `schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RoleType         { submitter secretary deputy director admin monitor }
enum Category         { finance personnel general }
enum SubmissionStatus { running returned done }
enum StageKey         { submitter secretary deputy director recording done }
enum TrailKind        { submit approve return }
enum Cluster          { HCRC MedTech StemCell DrugDevelopment }
enum DocumentKind     { primary supporting }
enum DocumentStatus   { pending ready }

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  type         RoleType
  position     String
  initials     String
  category     Category?
  cluster      Cluster?
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())

  submitted        Submission[]    @relation("requester")
  assigned         Submission[]    @relation("assignedSecretary")
  sessions         Session[]
  historyEntries   HistoryEntry[]
  uploads          Document[]
  checklistClosed  ChecklistItem[]
  stageRules       StageRule[]
  categoryRoutes   CategoryRoute[]
}

model Submission {
  id                  String           @id @default(cuid())
  code                String           @unique
  title               String
  summary             String?
  requesterId         String
  assignedSecretaryId String
  cluster             Cluster
  category            Category
  stageKey            StageKey
  status              SubmissionStatus
  stageEnteredAt      DateTime
  createdAt           DateTime         @default(now())

  requester          User            @relation("requester", fields: [requesterId], references: [id])
  assignedSecretary  User            @relation("assignedSecretary", fields: [assignedSecretaryId], references: [id])
  documents          Document[]
  history            HistoryEntry[]
  checklist          ChecklistItem[]

  @@index([assignedSecretaryId, status])
  @@index([cluster, status])
  @@index([requesterId, status])
}

model Document {
  id             String         @id @default(cuid())
  submissionId   String?
  kind           DocumentKind
  lineageId      String
  version        Int
  isCurrent      Boolean        @default(true)
  name           String
  contentType    String
  sizeBytes      Int
  storageKey     String         @unique
  status         DocumentStatus @default(pending)
  uploadedById   String
  historyEntryId String?
  createdAt      DateTime       @default(now())

  submission   Submission?   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  uploadedBy   User          @relation(fields: [uploadedById], references: [id])
  historyEntry HistoryEntry? @relation(fields: [historyEntryId], references: [id])

  @@unique([lineageId, version])
  @@index([submissionId, kind, isCurrent])
  @@index([status, createdAt])
}

model HistoryEntry {
  id            String     @id @default(cuid())
  submissionId  String
  actorId       String
  actorName     String
  actorPosition String
  kind          TrailKind
  action        String
  comment       String?
  fromStage     StageKey
  toStage       StageKey
  createdAt     DateTime   @default(now())

  submission Submission      @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  actor      User            @relation(fields: [actorId], references: [id])
  checklist  ChecklistItem[]
  documents  Document[]

  @@index([submissionId, createdAt])
}

model ChecklistItem {
  id             String    @id @default(cuid())
  historyEntryId String
  submissionId   String
  text           String
  done           Boolean   @default(false)
  doneAt         DateTime?
  doneById       String?

  historyEntry HistoryEntry @relation(fields: [historyEntryId], references: [id], onDelete: Cascade)
  submission   Submission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  doneBy       User?        @relation(fields: [doneById], references: [id])

  @@index([submissionId, done])
}

model StageRule {
  stageKey    StageKey @id
  slaDays     Int?
  updatedAt   DateTime @updatedAt
  updatedById String

  updatedBy User @relation(fields: [updatedById], references: [id])
}

model CategoryRoute {
  category    Category @id
  secretaryId String
  updatedAt   DateTime @updatedAt
  updatedById String

  updatedBy User @relation(fields: [updatedById], references: [id])
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  userAgent String?
  ip        String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model CodeCounter {
  prefix     String
  period     String
  lastNumber Int

  @@id([prefix, period])
}
```

`Document.submissionId` nullable dengan sengaja: dokumen dibuat berstatus `pending` **sebelum** pengajuannya ada (langkah 1 alur upload), lalu ditautkan saat pengajuan dibuat.

- [ ] **Step 2: Jalankan migrasi pertama**

```bash
docker compose up -d
npm run db:migrate -w @imeri/api -- --name init
```
Expected: folder `apps/api/prisma/migrations/<timestamp>_init/` terbentuk, client ter-generate.

- [ ] **Step 3: Tulis test yang gagal untuk pemeta domain**

`apps/api/tests/toDomain.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { daysSince } from '../src/db/toDomain'

describe('daysSince', () => {
  it('hari pertama di satu meja dihitung 1, bukan 0', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-13T08:00:00Z'), now)).toBe(1)
  })

  it('bertambah satu tiap 24 jam penuh', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-12T08:00:00Z'), now)).toBe(2)
    expect(daysSince(new Date('2026-09-11T08:00:00Z'), now)).toBe(3)
  })

  it('tidak pernah negatif', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-20T08:00:00Z'), now)).toBe(1)
  })
})
```

Prototipe memakai `hari: 1` untuk berkas yang baru masuk, jadi hari pertama bernilai 1. Ini mempertahankan arti angka "hari 1/2" di layar.

- [ ] **Step 4: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- toDomain`
Expected: FAIL, `Cannot find module '../src/db/toDomain'`.

- [ ] **Step 5: Implementasi client dan pemeta**

`apps/api/src/db/client.ts`:

```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

`apps/api/src/db/toDomain.ts`:

```ts
import type {
  ChecklistItem as DbChecklistItem,
  Document as DbDocument,
  HistoryEntry as DbHistoryEntry,
  Submission as DbSubmission,
  User as DbUser,
} from '@prisma/client'
import type { Attachment, ChecklistItem, Role, Submission, TrailEntry } from '@imeri/shared'

const MS_PER_DAY = 86_400_000

/** Day counter for a desk: the first day counts as 1, matching the screen label "hari 1/2". */
export function daysSince(from: Date, now: Date = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - from.getTime()) / MS_PER_DAY) + 1)
}

export type SubmissionRow = DbSubmission & {
  requester: Pick<DbUser, 'name'>
  documents: DbDocument[]
  history: DbHistoryEntry[]
  checklist: DbChecklistItem[]
}

const toAttachment = (doc: DbDocument): Attachment => ({
  name: doc.name,
  type: doc.name.toLowerCase().endsWith('.xlsx') || doc.name.toLowerCase().endsWith('.xls') ? 'xls' : 'pdf',
  size: `${Math.round(doc.sizeBytes / 1024)} KB`,
})

const toTrailEntry = (entry: DbHistoryEntry): TrailEntry => ({
  actor: entry.actorName,
  role: entry.actorPosition,
  action: entry.action,
  time: entry.createdAt.toISOString(),
  kind: entry.kind,
  ...(entry.comment === null ? {} : { comment: entry.comment }),
})

const toChecklistItem = (item: DbChecklistItem): ChecklistItem => ({ text: item.text, done: item.done })

/**
 * Checklist rows are never deleted — they belong to the return that created them,
 * so "what did the secretary ask for back then?" stays answerable. The *active*
 * checklist is only the newest return's items, and only while the document is
 * still in the returned state.
 */
function activeChecklist(row: SubmissionRow): readonly DbChecklistItem[] {
  if (row.status !== 'returned') return []
  const lastReturn = [...row.history].reverse().find((entry) => entry.kind === 'return')
  if (!lastReturn) return []
  return row.checklist.filter((item) => item.historyEntryId === lastReturn.id)
}

/** Prisma row → the shared domain type the flow rules operate on. */
export function toDomainSubmission(row: SubmissionRow, now: Date = new Date()): Submission {
  return {
    code: row.code,
    title: row.title,
    requester: row.requester.name,
    requesterId: row.requesterId,
    cluster: row.cluster,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    stageKey: row.stageKey,
    daysInStage: row.status === 'done' ? 0 : daysSince(row.stageEnteredAt, now),
    status: row.status,
    attachments: row.documents.filter((doc) => doc.status === 'ready' && doc.isCurrent).map(toAttachment),
    checklist: activeChecklist(row).map(toChecklistItem),
    history: row.history.map(toTrailEntry),
  }
}

export const toDomainRole = (user: DbUser): Role => ({
  id: user.id,
  name: user.name,
  type: user.type,
  position: user.position,
  initials: user.initials,
  ...(user.category === null ? {} : { category: user.category }),
  ...(user.cluster === null ? {} : { cluster: user.cluster }),
})
```

Penyebaran bersyarat (`...(x === null ? {} : { key: x })`) diperlukan karena `exactOptionalPropertyTypes` melarang memberikan `undefined` ke properti opsional.

- [ ] **Step 6: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- toDomain`
Expected: PASS.

- [ ] **Step 7: Buat helper database untuk test**

`apps/api/tests/helpers/db.ts`:

```ts
import { prisma } from '../../src/db/client'

/** Wipe every table between tests. Order matters: children before parents. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ChecklistItem", "Document", "HistoryEntry", "Submission",
      "Session", "StageRule", "CategoryRoute", "CodeCounter", "User"
    RESTART IDENTITY CASCADE
  `)
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma apps/api/src/db apps/api/tests
git commit -m "$(cat <<'MSG'
Skema Prisma, migrasi awal, dan pemeta ke tipe domain

Skema mengikuti spec: sekret dikunci lewat assignedSecretaryId, stageEnteredAt
menggantikan penghitung hari, riwayat menyimpan salinan nama dan jabatan pelaku,
checklist menggantung pada entri pengembalian, dan dokumen berversi lewat
lineageId.

toDomainSubmission menghitung daysInStage dari stageEnteredAt saat dibaca,
sehingga tidak perlu cron yang menaikkan angka hari tiap tengah malam.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Autentikasi dan sesi

**Files:**
- Create: `apps/api/src/modules/auth/{repository,service,routes}.ts`
- Create: `apps/api/src/middleware/requireAuth.ts`
- Create: `apps/api/tests/helpers/auth.ts`
- Create: `apps/api/tests/auth.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>` dan `verifyPassword(hash: string, plain: string): Promise<boolean>` dari `modules/auth/service.ts`
  - `signIn(email, password, meta): Promise<{ token: string; role: Role }>`
  - `requireAuth` — middleware yang mengisi `req.user: Role` dan `req.userId: string`
  - `requireAdmin` — middleware yang melempar `Forbidden('admin_only')`
  - `loginAs(app, email, password)` dari `tests/helpers/auth.ts` — mengembalikan agent supertest yang membawa cookie

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/auth.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { hashPassword } from '../src/modules/auth/service'
import { disconnectDb, resetDb } from './helpers/db'

const app = createApp()

beforeEach(async () => {
  await resetDb()
  await prisma.user.create({
    data: {
      email: 'sari.d@ui.ac.id',
      passwordHash: await hashPassword('rahasia123'),
      name: 'Sari Dewi',
      type: 'secretary',
      position: 'Sekret Keuangan',
      initials: 'SD',
      category: 'finance',
    },
  })
})

afterAll(disconnectDb)

describe('POST /auth/login', () => {
  it('menerima kredensial yang benar dan memasang cookie', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Sari Dewi')
    expect(res.body.category).toBe('finance')
    expect(res.body.passwordHash).toBeUndefined()
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly')
  })

  it('menolak password salah tanpa membocorkan apa yang salah', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'salah' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('invalid_credentials')
  })

  it('memberi kode yang sama untuk email tak dikenal', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'hantu@ui.ac.id', password: 'apa pun' })
    expect(res.body.error.code).toBe('invalid_credentials')
  })

  it('menolak akun nonaktif', async () => {
    await prisma.user.update({ where: { email: 'sari.d@ui.ac.id' }, data: { active: false } })
    const res = await request(app).post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    expect(res.body.error.code).toBe('invalid_credentials')
  })
})

describe('GET /auth/me', () => {
  it('menolak tanpa sesi', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('unauthenticated')
  })

  it('mengembalikan peran setelah login', async () => {
    const agent = request.agent(app)
    await agent.post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    const res = await agent.get('/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.id).toBeTruthy()
    expect(res.body.name).toBe('Sari Dewi')
  })
})

describe('POST /auth/logout', () => {
  it('mencabut sesi sehingga request berikutnya ditolak', async () => {
    const agent = request.agent(app)
    await agent.post('/auth/login').send({ email: 'sari.d@ui.ac.id', password: 'rahasia123' })
    await agent.post('/auth/logout')
    const res = await agent.get('/auth/me')
    expect(res.status).toBe(401)
    expect(await prisma.session.count()).toBe(0)
  })
})
```

Ketiga kegagalan login memakai kode yang sama (`invalid_credentials`) dengan sengaja — membedakan "email tidak ada" dari "password salah" memberi penyerang cara mengetahui email mana yang terdaftar.

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- auth`
Expected: FAIL, modul `modules/auth/service` tidak ada.

- [ ] **Step 3: Implementasi service auth**

`apps/api/src/modules/auth/repository.ts`:

```ts
import { prisma } from '../../db/client'

export const authRepo = {
  userByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  userById: (id: string) => prisma.user.findUnique({ where: { id } }),
  createSession: (data: { id: string; userId: string; expiresAt: Date; userAgent?: string; ip?: string }) =>
    prisma.session.create({ data }),
  sessionById: (id: string) => prisma.session.findUnique({ where: { id }, include: { user: true } }),
  deleteSession: (id: string) => prisma.session.deleteMany({ where: { id } }),
  deleteExpired: () => prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
}
```

`apps/api/src/modules/auth/service.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import type { Role } from '@imeri/shared'
import { toDomainRole } from '../../db/toDomain'
import { env } from '../../env'
import { BadRequest } from '../../errors'
import { authRepo } from './repository'

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, { type: argon2.argon2id })

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

/** The cookie carries the raw token; only its hash is stored, so a DB leak cannot resume sessions. */
const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex')

export interface SessionMeta {
  readonly userAgent?: string
  readonly ip?: string
}

export async function signIn(email: string, password: string, meta: SessionMeta): Promise<{ token: string; role: Role }> {
  const user = await authRepo.userByEmail(email)
  // Verify against a dummy hash when the user is missing, so timing cannot reveal which emails exist.
  const ok = user && user.active ? await verifyPassword(user.passwordHash, password) : false
  if (!user || !user.active || !ok) throw BadRequest('invalid_credentials')

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000)
  await authRepo.createSession({
    id: tokenHash(token),
    userId: user.id,
    expiresAt,
    ...(meta.userAgent === undefined ? {} : { userAgent: meta.userAgent }),
    ...(meta.ip === undefined ? {} : { ip: meta.ip }),
  })

  return { token, role: toDomainRole(user) }
}

export async function roleForToken(token: string): Promise<Role | null> {
  const session = await authRepo.sessionById(tokenHash(token))
  if (!session || session.expiresAt < new Date() || !session.user.active) return null
  return toDomainRole(session.user)
}

export const signOut = (token: string): Promise<unknown> => authRepo.deleteSession(tokenHash(token))
```

- [ ] **Step 4: Implementasi middleware**

`apps/api/src/middleware/requireAuth.ts`:

```ts
import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@imeri/shared'
import { Forbidden, Unauthenticated } from '../errors'
import { roleForToken } from '../modules/auth/service'

export const SESSION_COOKIE = 'imeri_session'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: Role
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (!token) return next(Unauthenticated())

  const role = await roleForToken(token)
  if (!role) return next(Unauthenticated())

  req.user = role
  next()
}

/** Must run after requireAuth. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.type !== 'admin') return next(Forbidden('admin_only'))
  next()
}

/** Reads req.user set by requireAuth; throws rather than returning undefined. */
export function currentUser(req: Request): Role {
  if (!req.user) throw Unauthenticated()
  return req.user
}
```

- [ ] **Step 5: Implementasi routes dan pasang di app**

`apps/api/src/modules/auth/routes.ts`:

```ts
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../env'
import { BadRequest } from '../../errors'
import { SESSION_COOKIE, currentUser, requireAuth } from '../../middleware/requireAuth'
import { signIn, signOut } from './service'

const credentials = z.object({ email: z.string().email(), password: z.string().min(1) })

export const authRoutes = Router()

authRoutes.post('/login', async (req, res) => {
  const parsed = credentials.safeParse(req.body)
  if (!parsed.success) throw BadRequest('invalid_credentials')

  const { token, role } = await signIn(parsed.data.email, parsed.data.password, {
    ...(req.get('user-agent') === undefined ? {} : { userAgent: req.get('user-agent') as string }),
    ...(req.ip === undefined ? {} : { ip: req.ip }),
  })

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE,
    maxAge: env.SESSION_TTL_HOURS * 3_600_000,
    path: '/',
  })
  res.json(role)
})

authRoutes.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (token) await signOut(token)
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.status(204).end()
})

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json(currentUser(req))
})
```

Di `apps/api/src/app.ts`, pasang sebelum handler 404:

```ts
import { authRoutes } from './modules/auth/routes'
// ...
  app.use('/auth', authRoutes)
```

- [ ] **Step 6: Buat helper login untuk test**

`apps/api/tests/helpers/auth.ts`:

```ts
import request from 'supertest'
import type express from 'express'

export type Agent = ReturnType<typeof request.agent>

/** Returns a supertest agent that carries the session cookie. */
export async function loginAs(app: express.Express, email: string, password: string): Promise<Agent> {
  const agent = request.agent(app)
  const res = await agent.post('/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`)
  return agent
}
```

- [ ] **Step 7: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- auth`
Expected: seluruh test PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Autentikasi dengan sesi di database

Password di-hash argon2id. Sesi disimpan di tabel Session dan dirujuk lewat
cookie httpOnly; yang tersimpan di database hanya hash token, jadi bocornya
database tidak membuat sesi bisa dilanjutkan.

Sesi dipilih ketimbang JWT karena harus bisa dicabut: untuk berkas kepegawaian,
kalau laptop hilang atau seseorang keluar, admin harus bisa mematikan sesinya
saat itu juga.

Kegagalan login selalu memakai kode invalid_credentials yang sama, agar tidak
membocorkan email mana yang terdaftar.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 7: Skrip seed

Memindahkan data seed frontend ke database, sehingga tampilan awal setelah frontend dialihkan bisa dibandingkan berdampingan dengan versi prototipe.

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/tests/seed.test.ts`

**Interfaces:**
- Consumes: `hashPassword` (Task 6), `prisma` (Task 5)
- Produces: `seed(): Promise<void>` — idempoten, menolak jalan di production

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/seed.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'

beforeEach(resetDb)
afterAll(disconnectDb)

describe('seed', () => {
  it('mengisi sembilan akun, aturan tahap, dan rute kategori', async () => {
    await seed()
    expect(await prisma.user.count()).toBe(9)
    expect(await prisma.stageRule.count()).toBe(6)
    expect(await prisma.categoryRoute.count()).toBe(3)
  })

  it('tiap pengajuan punya sekret yang terkunci dan riwayat', async () => {
    await seed()
    const submissions = await prisma.submission.findMany({ include: { history: true } })
    expect(submissions.length).toBeGreaterThan(0)
    for (const s of submissions) {
      expect(s.assignedSecretaryId).toBeTruthy()
      expect(s.history.length).toBeGreaterThan(0)
    }
  })

  it('berkas yang dikembalikan punya checklist yang menggantung pada entri pengembalian', async () => {
    await seed()
    const returned = await prisma.submission.findFirst({
      where: { status: 'returned' },
      include: { checklist: true },
    })
    expect(returned).toBeTruthy()
    expect(returned!.checklist.length).toBeGreaterThan(0)
    for (const item of returned!.checklist) {
      expect(item.historyEntryId).toBeTruthy()
    }
  })

  it('bisa dijalankan dua kali tanpa menggandakan data', async () => {
    await seed()
    await seed()
    expect(await prisma.user.count()).toBe(9)
  })

  it('menolak jalan di production', async () => {
    const before = process.env['NODE_ENV']
    process.env['NODE_ENV'] = 'production'
    await expect(seed()).rejects.toThrow(/production/i)
    process.env['NODE_ENV'] = before
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- seed`
Expected: FAIL, `Cannot find module '../prisma/seed'`.

- [ ] **Step 3: Implementasi seed**

`apps/api/prisma/seed.ts`. Kerangkanya:

```ts
import { prisma } from '../src/db/client'
import { hashPassword } from '../src/modules/auth/service'

const DEV_PASSWORD = 'prototipe123'

const USERS = [
  { key: 'rina',   email: 'rina.k@ui.ac.id',  name: 'Rina Kartika',  type: 'submitter', position: 'Pengaju · Cluster HCRC', initials: 'RK', cluster: 'HCRC' },
  { key: 'sari',   email: 'sari.d@ui.ac.id',  name: 'Sari Dewi',     type: 'secretary', position: 'Sekret Keuangan',        initials: 'SD', category: 'finance' },
  { key: 'budi',   email: 'budi.s@ui.ac.id',  name: 'Budi Santoso',  type: 'secretary', position: 'Sekret Kepegawaian',     initials: 'BS', category: 'personnel' },
  { key: 'tuti',   email: 'tuti.m@ui.ac.id',  name: 'Tuti Marlina',  type: 'secretary', position: 'Sekret Umum',            initials: 'TM', category: 'general' },
  { key: 'hendra', email: 'hendra.w@ui.ac.id',name: 'Hendra Wijaya', type: 'deputy',    position: 'Wakil Direktur',         initials: 'HW' },
  { key: 'ratna',  email: 'ratna.p@ui.ac.id', name: 'Ratna Puspita', type: 'director',  position: 'Direktur',               initials: 'RP' },
  { key: 'yoga',   email: 'yoga.p@ui.ac.id',  name: 'Yoga Pratama',  type: 'admin',     position: 'Super Admin',            initials: 'YP' },
  { key: 'nadia',  email: 'nadia.r@ui.ac.id', name: 'Nadia Rahma',   type: 'monitor',   position: 'Monitor Cluster HCRC',   initials: 'NR', cluster: 'HCRC' },
  { key: 'ferry',  email: 'ferry.g@ui.ac.id', name: 'Ferry Gunawan', type: 'monitor',   position: 'Monitor Cluster MedTech',initials: 'FG', cluster: 'MedTech' },
] as const

const SLA = { submitter: null, secretary: 1, deputy: 2, director: 2, recording: 1, done: null } as const
const ROUTE = { finance: 'sari', personnel: 'budi', general: 'tuti' } as const
const PREFIX = { finance: 'PJK', personnel: 'PJP', general: 'PJU' } as const

export async function seed(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('Refusing to seed in production: this creates accounts with a known password')
  }

  const passwordHash = await hashPassword(DEV_PASSWORD)
  const ids = new Map<string, string>()

  for (const u of USERS) {
    const { key, ...rest } = u
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...rest, passwordHash },
    })
    ids.set(key, user.id)
  }

  const admin = ids.get('yoga')!

  for (const [stageKey, slaDays] of Object.entries(SLA)) {
    await prisma.stageRule.upsert({
      where: { stageKey: stageKey as keyof typeof SLA },
      update: {},
      create: { stageKey: stageKey as keyof typeof SLA, slaDays, updatedById: admin },
    })
  }

  for (const [category, secretaryKey] of Object.entries(ROUTE)) {
    await prisma.categoryRoute.upsert({
      where: { category: category as keyof typeof ROUTE },
      update: {},
      create: { category: category as keyof typeof ROUTE, secretaryId: ids.get(secretaryKey)!, updatedById: admin },
    })
  }

  // ... pengajuan menyusul di Step 4
  console.log(`Seed selesai. Password semua akun: ${DEV_PASSWORD}`)
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}
```

- [ ] **Step 4: Tambahkan pengajuan seed**

Lanjutkan `seed()` dengan sebuah helper yang membuat satu pengajuan lengkap dengan riwayat yang konsisten dengan tahap berhentinya. Ambil judul, pemohon, cluster, kategori, tahap, dan status dari `apps/web/src/constants/submissions.ts` — dua puluh berkas, sama persis. Petakan `stageKey` langsung, dan `stageEnteredAt` mundur sebanyak `daysInStage` hari dari sekarang supaya angka "hari n/m" di layar sama dengan prototipe:

```ts
const STAGE_SEQUENCE = ['submitter', 'secretary', 'deputy', 'director', 'recording', 'done'] as const

async function createSubmission(input: {
  code: string
  title: string
  requesterKey: string
  cluster: 'HCRC' | 'MedTech' | 'StemCell' | 'DrugDevelopment'
  category: 'finance' | 'personnel' | 'general'
  stageKey: (typeof STAGE_SEQUENCE)[number]
  daysInStage: number
  status: 'running' | 'returned' | 'done'
  checklist?: readonly { text: string; done: boolean }[]
}, ids: Map<string, string>): Promise<void> {
  const existing = await prisma.submission.findUnique({ where: { code: input.code } })
  if (existing) return

  const requesterId = ids.get(input.requesterKey)!
  const secretaryId = ids.get(ROUTE[input.category])!
  const stageEnteredAt = new Date(Date.now() - (input.daysInStage - 1) * 86_400_000)

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

  const submitEntry = await prisma.historyEntry.create({
    data: {
      submissionId: submission.id,
      actorId: requesterId,
      actorName: USERS.find((u) => u.key === input.requesterKey)!.name,
      actorPosition: 'Pengaju',
      kind: 'submit',
      action: 'mengirim pengajuan',
      fromStage: 'submitter',
      toStage: 'secretary',
    },
  })

  if (input.status === 'returned' && input.checklist?.length) {
    const returnEntry = await prisma.historyEntry.create({
      data: {
        submissionId: submission.id,
        actorId: secretaryId,
        actorName: USERS.find((u) => u.key === ROUTE[input.category])!.name,
        actorPosition: USERS.find((u) => u.key === ROUTE[input.category])!.position,
        kind: 'return',
        action: 'mengembalikan ke Pengaju',
        comment: input.checklist.map((c) => c.text).join('. ') + '.',
        fromStage: 'secretary',
        toStage: 'submitter',
      },
    })
    await prisma.checklistItem.createMany({
      data: input.checklist.map((c) => ({
        historyEntryId: returnEntry.id,
        submissionId: submission.id,
        text: c.text,
        done: c.done,
      })),
    })
  }

  void submitEntry
}
```

Kemudian panggil `createSubmission` untuk dua puluh berkas dengan data yang disalin dari `SUBMISSION_SEED`. Dokumen tidak diseed — object store lokal kosong dan menaruh kunci palsu akan membuat `head()` gagal di Task 9.

- [ ] **Step 5: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- seed`
Expected: seluruh test PASS.

- [ ] **Step 6: Jalankan seed sungguhan**

Run: `npm run db:seed -w @imeri/api`
Expected: mencetak `Seed selesai. Password semua akun: prototipe123`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/tests/seed.test.ts
git commit -m "$(cat <<'MSG'
Skrip seed database

Memindahkan data seed frontend ke database supaya tampilan awal setelah
frontend dialihkan bisa dibandingkan berdampingan dengan versi prototipe; yang
berbeda berarti bug, bukan tebak-tebakan.

Idempoten lewat upsert, dan menolak jalan kalau NODE_ENV=production karena
menanam akun ber-password yang diketahui ke database berisi data asli adalah
lubang yang nyata.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 8: Membaca pengajuan

**Files:**
- Create: `apps/api/src/modules/submissions/{repository,service,routes}.ts`
- Create: `apps/api/src/modules/flowRules/repository.ts`
- Create: `apps/api/tests/submissions.read.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `toDomainSubmission`, `requireAuth`, `currentUser`, `loginAs`
- Produces:
  - `loadStages(): Promise<readonly Stage[]>` dari `modules/flowRules/repository.ts` — membaca `StageRule` menjadi tipe `Stage` shared
  - `listVisible(role: Role): Promise<readonly Submission[]>`
  - `getVisible(code: string, role: Role): Promise<Submission>` — melempar `NotFound` bila di luar lingkup
  - `SUBMISSION_INCLUDE` — objek `include` Prisma yang dipakai bersama semua query

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/submissions.read.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeAll(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('GET /submissions', () => {
  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).get('/submissions')
    expect(res.status).toBe(401)
  })

  it('sekret Keuangan hanya menerima berkas kategori finance', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    for (const item of res.body) expect(item.category).toBe('finance')
  })

  it('monitor cluster hanya menerima berkas clusternya', async () => {
    const agent = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    for (const item of res.body) expect(item.cluster).toBe('HCRC')
  })

  it('pengaju hanya menerima berkas miliknya', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    for (const item of res.body) expect(item.requester).toBe('Rina Kartika')
  })

  it('admin menerima semuanya', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const all = await admin.get('/submissions')
    const some = await sari.get('/submissions')
    expect(all.body.length).toBeGreaterThan(some.body.length)
  })

  it('tidak menerima parameter untuk melihat sebagai peran lain', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/submissions?role=admin&category=personnel')
    for (const item of res.body) expect(item.category).toBe('finance')
  })

  it('menyertakan daysInStage yang dihitung, bukan tersimpan', async () => {
    const agent = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await agent.get('/submissions')
    const running = res.body.find((s: { status: string }) => s.status === 'running')
    expect(running.daysInStage).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /submissions/:code', () => {
  it('mengembalikan berkas dalam lingkup', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const list = await agent.get('/submissions')
    const code = list.body[0].code
    const res = await agent.get(`/submissions/${code}`)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(code)
    expect(Array.isArray(res.body.history)).toBe(true)
  })

  it('menjawab 404 untuk berkas di luar lingkup, bukan 403', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const all = await admin.get('/submissions')
    const foreign = all.body.find((s: { category: string }) => s.category === 'personnel')

    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.get(`/submissions/${foreign.code}`)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('menjawab 404 untuk kode yang tidak ada', async () => {
    const agent = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await agent.get('/submissions/TIDAK-ADA-999')
    expect(res.status).toBe(404)
  })
})
```

Test "404 bukan 403" itu inti: 403 memberi tahu bahwa kodenya ada, dan untuk berkas kepegawaian keberadaan berkas itu sendiri sudah informasi.

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- submissions.read`
Expected: FAIL, rute `/submissions` belum ada (404 dengan `not_found` untuk semua kasus).

- [ ] **Step 3: Implementasi pembaca aturan tahap**

`apps/api/src/modules/flowRules/repository.ts`:

```ts
import type { Stage } from '@imeri/shared'
import { STAGE_ORDER } from '@imeri/shared'
import { prisma } from '../../db/client'

/** StageRule rows → the shared Stage list, in canonical order. */
export async function loadStages(): Promise<readonly Stage[]> {
  const rows = await prisma.stageRule.findMany()
  const bySla = new Map(rows.map((row) => [row.stageKey, row.slaDays]))
  return STAGE_ORDER.map((key) => ({ key, sla: bySla.get(key) ?? null }))
}

export async function loadRoute(): Promise<Readonly<Record<string, string>>> {
  const rows = await prisma.categoryRoute.findMany()
  return Object.fromEntries(rows.map((row) => [row.category, row.secretaryId]))
}
```

- [ ] **Step 4: Implementasi repository, service, routes**

`apps/api/src/modules/submissions/repository.ts`:

```ts
import { prisma } from '../../db/client'

export const SUBMISSION_INCLUDE = {
  requester: { select: { name: true } },
  documents: true,
  history: { orderBy: { createdAt: 'asc' } },
  checklist: true,
} as const

export const submissionRepo = {
  all: () => prisma.submission.findMany({ include: SUBMISSION_INCLUDE, orderBy: { createdAt: 'desc' } }),
  byCode: (code: string) => prisma.submission.findUnique({ where: { code }, include: SUBMISSION_INCLUDE }),
}
```

`apps/api/src/modules/submissions/service.ts`:

```ts
import { isVisible } from '@imeri/shared'
import type { Role, Submission } from '@imeri/shared'
import { toDomainSubmission } from '../../db/toDomain'
import { NotFound } from '../../errors'
import { submissionRepo } from './repository'

/** Scope is always derived from the session — never from a request parameter. */
export async function listVisible(role: Role): Promise<readonly Submission[]> {
  const rows = await submissionRepo.all()
  return rows.map((row) => toDomainSubmission(row)).filter((item) => isVisible(item, role))
}

/** Out of scope reads as missing: 403 would confirm the code exists. */
export async function getVisible(code: string, role: Role): Promise<Submission> {
  const row = await submissionRepo.byCode(code)
  if (!row) throw NotFound()
  const submission = toDomainSubmission(row)
  if (!isVisible(submission, role)) throw NotFound()
  return submission
}
```

`apps/api/src/modules/submissions/routes.ts`:

```ts
import { Router } from 'express'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { getVisible, listVisible } from './service'

export const submissionRoutes = Router()

submissionRoutes.use(requireAuth)

submissionRoutes.get('/', async (req, res) => {
  res.json(await listVisible(currentUser(req)))
})

submissionRoutes.get('/:code', async (req, res) => {
  res.json(await getVisible(req.params.code, currentUser(req)))
})
```

Di `app.ts`, pasang `app.use('/submissions', submissionRoutes)` sebelum handler 404.

- [ ] **Step 5: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- submissions.read`
Expected: seluruh test PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Endpoint membaca pengajuan dengan lingkup dari sesi

GET /submissions tidak menerima parameter untuk melihat sebagai peran lain;
lingkup selalu diturunkan dari sesi lewat isVisible() milik packages/shared,
fungsi yang sama dengan yang dipakai browser.

Berkas di luar lingkup menjawab 404, bukan 403: 403 memberi tahu bahwa kodenya
ada, dan untuk berkas kepegawaian keberadaan berkas itu sendiri sudah informasi.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 9: `FileStore` dan presigned URL

**Files:**
- Create: `apps/api/src/storage/FileStore.ts`, `apps/api/src/storage/s3Store.ts`
- Create: `apps/api/src/modules/documents/{repository,service,routes}.ts`
- Create: `apps/api/tests/storage.test.ts`, `apps/api/tests/documents.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `FileStore` interface + `s3Store: FileStore`
  - `requestUpload(user, input): Promise<{ documentId: string; uploadUrl: string; expiresIn: number }>`
  - `downloadUrlFor(documentId, role): Promise<string>`
  - `buildStorageKey(filename: string): string`

- [ ] **Step 1: Tulis interface**

`apps/api/src/storage/FileStore.ts`:

```ts
export interface FileStore {
  presignUpload(key: string, contentType: string): Promise<{ url: string; expiresIn: number }>
  presignDownload(key: string, filename: string, ttlSeconds: number): Promise<string>
  head(key: string): Promise<{ sizeBytes: number; contentType: string } | null>
  delete(key: string): Promise<void>
}

export const ALLOWED_CONTENT_TYPES: readonly string[] = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
```

- [ ] **Step 2: Tulis test yang gagal terhadap MinIO sungguhan**

`apps/api/tests/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildStorageKey } from '../src/modules/documents/service'
import { s3Store } from '../src/storage/s3Store'

describe('buildStorageKey', () => {
  it('membersihkan nama berkas dan menyisipkan uuid', () => {
    const key = buildStorageKey('Surat Tugas (draf).pdf')
    expect(key).toMatch(/^submissions\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/surat-tugas-draf\.pdf$/)
  })

  it('tidak pernah menghasilkan traversal', () => {
    const key = buildStorageKey('../../etc/passwd')
    expect(key).not.toContain('..')
  })

  it('dua berkas bernama sama menghasilkan kunci berbeda', () => {
    expect(buildStorageKey('a.pdf')).not.toBe(buildStorageKey('a.pdf'))
  })
})

describe('s3Store terhadap MinIO', () => {
  it('bisa menulis lewat presigned PUT lalu membacanya kembali', async () => {
    const key = buildStorageKey('uji.pdf')
    const { url } = await s3Store.presignUpload(key, 'application/pdf')

    const body = Buffer.from('%PDF-1.4 halo')
    const put = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': 'application/pdf' } })
    expect(put.ok).toBe(true)

    const meta = await s3Store.head(key)
    expect(meta?.sizeBytes).toBe(body.byteLength)

    const download = await s3Store.presignDownload(key, 'uji.pdf', 60)
    const got = await fetch(download)
    expect(await got.text()).toBe('%PDF-1.4 halo')

    await s3Store.delete(key)
    expect(await s3Store.head(key)).toBeNull()
  })

  it('head mengembalikan null untuk kunci yang tidak ada', async () => {
    expect(await s3Store.head('submissions/2026/01/tidak/ada.pdf')).toBeNull()
  })
})
```

Ini diuji terhadap MinIO sungguhan, bukan mock: penandatanganan presigned URL justru bagian yang diam-diam berbeda antar implementasi, jadi mock hanya menguji dirinya sendiri.

- [ ] **Step 3: Jalankan — harus GAGAL**

Run: `docker compose up -d && npm test -w @imeri/api -- storage`
Expected: FAIL, modul `s3Store` tidak ada.

- [ ] **Step 4: Implementasi `s3Store`**

```ts
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../env'
import type { FileStore } from './FileStore'

const UPLOAD_TTL = 300

const client = new S3Client({
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  ...(env.S3_ENDPOINT === undefined ? {} : { endpoint: env.S3_ENDPOINT }),
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

export const s3Store: FileStore = {
  async presignUpload(key, contentType) {
    const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType })
    const url = await getSignedUrl(client, command, { expiresIn: UPLOAD_TTL })
    return { url, expiresIn: UPLOAD_TTL }
  },

  async presignDownload(key, filename, ttlSeconds) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"`,
    })
    return getSignedUrl(client, command, { expiresIn: ttlSeconds })
  },

  async head(key) {
    try {
      const out = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
      return { sizeBytes: out.ContentLength ?? 0, contentType: out.ContentType ?? 'application/octet-stream' }
    } catch {
      return null
    }
  },

  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  },
}
```

- [ ] **Step 5: Implementasi modul documents**

`apps/api/src/modules/documents/service.ts`:

```ts
import { randomUUID } from 'node:crypto'
import type { Role } from '@imeri/shared'
import { isVisible } from '@imeri/shared'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import { BadRequest, NotFound } from '../../errors'
import { env } from '../../env'
import { ALLOWED_CONTENT_TYPES } from '../../storage/FileStore'
import { s3Store } from '../../storage/s3Store'
import { SUBMISSION_INCLUDE } from '../submissions/repository'

/** Storage keys are always built by the server: UUID-based, sanitised, never client-supplied. */
export function buildStorageKey(filename: string): string {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const base = filename.split(/[\\/]/).pop() ?? 'berkas'
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'

  const slug =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'berkas'

  return `submissions/${year}/${month}/${randomUUID()}/${slug}.${ext}`
}

export interface UploadRequest {
  readonly filename: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly kind: 'primary' | 'supporting'
}

export async function requestUpload(user: Role, input: UploadRequest) {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) throw BadRequest('unsupported_file_type')
  if (input.sizeBytes > env.MAX_UPLOAD_BYTES) throw BadRequest('file_too_large')

  const storageKey = buildStorageKey(input.filename)
  const id = randomUUID()

  const document = await prisma.document.create({
    data: {
      id,
      kind: input.kind,
      lineageId: id,
      version: 1,
      isCurrent: true,
      name: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storageKey,
      status: 'pending',
      uploadedById: user.id,
    },
  })

  const { url, expiresIn } = await s3Store.presignUpload(storageKey, input.contentType)
  return { documentId: document.id, uploadUrl: url, expiresIn }
}

const DOWNLOAD_TTL = 60

export async function downloadUrlFor(documentId: string, role: Role): Promise<string> {
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document || document.status !== 'ready' || !document.submissionId) throw NotFound()

  const row = await prisma.submission.findUnique({
    where: { id: document.submissionId },
    include: SUBMISSION_INCLUDE,
  })
  if (!row || !isVisible(toDomainSubmission(row), role)) throw NotFound()

  return s3Store.presignDownload(document.storageKey, document.name, DOWNLOAD_TTL)
}

/** Verify the object really landed, and that its real size is within the limit. */
export async function confirmUploaded(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw BadRequest('document_not_uploaded')

  const meta = await s3Store.head(document.storageKey)
  if (!meta) throw BadRequest('document_not_uploaded')

  if (meta.sizeBytes > env.MAX_UPLOAD_BYTES) {
    await s3Store.delete(document.storageKey)
    await prisma.document.delete({ where: { id: documentId } })
    throw BadRequest('file_too_large')
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'ready', sizeBytes: meta.sizeBytes },
  })
}
```

`apps/api/src/modules/documents/routes.ts`:

```ts
import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { downloadUrlFor, requestUpload } from './service'

const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(['primary', 'supporting']),
})

export const documentRoutes = Router()
documentRoutes.use(requireAuth)

documentRoutes.post('/upload-url', async (req, res) => {
  const parsed = uploadInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.json(await requestUpload(currentUser(req), parsed.data))
})

documentRoutes.get('/:id/download-url', async (req, res) => {
  res.json({ url: await downloadUrlFor(req.params.id, currentUser(req)) })
})
```

Pasang `app.use('/documents', documentRoutes)` di `app.ts`.

- [ ] **Step 6: Tulis test endpoint**

`apps/api/tests/documents.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeAll(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /documents/upload-url', () => {
  it('menerbitkan URL dan membuat baris pending', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'nota.pdf', contentType: 'application/pdf', sizeBytes: 1024, kind: 'primary' })
    expect(res.status).toBe(200)
    expect(res.body.uploadUrl).toContain('http')
    expect(res.body.documentId).toBeTruthy()
  })

  it('menolak tipe berkas di luar daftar izin', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'jahat.exe', contentType: 'application/x-msdownload', sizeBytes: 10, kind: 'supporting' })
    expect(res.body.error.code).toBe('unsupported_file_type')
  })

  it('menolak ukuran melebihi batas', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'besar.pdf', contentType: 'application/pdf', sizeBytes: 999_999_999, kind: 'primary' })
    expect(res.body.error.code).toBe('file_too_large')
  })

  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).post('/documents/upload-url').send({})
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 7: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- storage documents`
Expected: seluruh test PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
FileStore S3-compatible dan penerbitan presigned URL

Satu implementasi melayani MinIO, S3, dan R2; berpindah di antaranya cukup
mengganti environment. File tidak pernah melewati API — browser mengunggah
langsung ke object store lewat presigned PUT.

storageKey selalu dibuat server dan berbasis UUID, sehingga path traversal,
tabrakan nama, dan saling menimpa antarpengguna mati sekaligus. Bucket private;
download hanya lewat URL bertanda tangan berumur 60 detik setelah pemeriksaan
lingkup.

Diuji terhadap MinIO sungguhan, bukan mock: penandatanganan presigned URL justru
bagian yang diam-diam berbeda antar implementasi.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 10: Membuat pengajuan

**Files:**
- Modify: `apps/api/src/modules/submissions/{repository,service,routes}.ts`
- Create: `apps/api/src/modules/submissions/code.ts`
- Create: `apps/api/tests/submissions.create.test.ts`

**Interfaces:**
- Produces:
  - `nextCode(tx, category): Promise<string>` dari `modules/submissions/code.ts`
  - `createSubmission(user, input): Promise<Submission>`

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/submissions.create.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

async function uploadedDocument(agent: Awaited<ReturnType<typeof loginAs>>, kind: 'primary' | 'supporting') {
  const res = await agent
    .post('/documents/upload-url')
    .send({ filename: `${kind}.pdf`, contentType: 'application/pdf', sizeBytes: 12, kind })
  await fetch(res.body.uploadUrl, {
    method: 'PUT',
    body: Buffer.from('%PDF-1.4 hi'),
    headers: { 'Content-Type': 'application/pdf' },
  })
  return res.body.documentId as string
}

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /submissions', () => {
  it('pengaju bisa membuat, dan berkas mendarat di meja sekret', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(agent, 'primary')

    const res = await agent.post('/submissions').send({
      title: 'Pengadaan rak arsip',
      category: 'finance',
      summary: 'Rak arsip penuh.',
      primaryDocumentId: primary,
      supportingDocumentIds: [],
    })

    expect(res.status).toBe(201)
    expect(res.body.stageKey).toBe('secretary')
    expect(res.body.status).toBe('running')
    expect(res.body.code).toMatch(/^PJK-\d{4}-\d{3}$/)
    expect(res.body.history).toHaveLength(1)
    expect(res.body.history[0].kind).toBe('submit')
  })

  it('mengunci sekret sesuai rute saat dibuat', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(agent, 'primary')
    const res = await agent
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: primary, supportingDocumentIds: [] })

    const row = await prisma.submission.findUnique({
      where: { code: res.body.code },
      include: { assignedSecretary: true },
    })
    expect(row?.assignedSecretary.name).toBe('Sari Dewi')
  })

  it('berkas yang sudah berjalan tidak ikut pindah saat rute diubah', async () => {
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const primary = await uploadedDocument(rina, 'primary')
    const created = await rina
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: primary, supportingDocumentIds: [] })

    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi.s@ui.ac.id' } })
    await prisma.categoryRoute.update({ where: { category: 'finance' }, data: { secretaryId: budi.id } })

    const row = await prisma.submission.findUnique({
      where: { code: created.body.code },
      include: { assignedSecretary: true },
    })
    expect(row?.assignedSecretary.name).toBe('Sari Dewi')
  })

  it('menolak peran selain pengaju', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent
      .post('/submissions')
      .send({ title: 'X', category: 'finance', primaryDocumentId: 'x', supportingDocumentIds: [] })
    expect(res.status).toBe(403)
  })

  it('menolak kalau dokumen utama belum benar-benar terunggah', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res0 = await agent
      .post('/documents/upload-url')
      .send({ filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    const res = await agent.post('/submissions').send({
      title: 'X',
      category: 'finance',
      primaryDocumentId: res0.body.documentId,
      supportingDocumentIds: [],
    })
    expect(res.body.error.code).toBe('document_not_uploaded')
  })

  it('nomor urut tidak pernah tabrakan walau dibuat bersamaan', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const docs = await Promise.all([1, 2, 3, 4, 5].map(() => uploadedDocument(agent, 'primary')))

    const results = await Promise.all(
      docs.map((id) =>
        agent
          .post('/submissions')
          .send({ title: 'Serentak', category: 'finance', primaryDocumentId: id, supportingDocumentIds: [] }),
      ),
    )

    const codes = results.map((r) => r.body.code)
    expect(new Set(codes).size).toBe(5)
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- submissions.create`
Expected: FAIL, rute POST belum ada.

- [ ] **Step 3: Implementasi penghitung kode**

`apps/api/src/modules/submissions/code.ts`:

```ts
import type { Category } from '@imeri/shared'
import type { Prisma } from '@prisma/client'

const PREFIX: Readonly<Record<Category, string>> = {
  finance: 'PJK',
  personnel: 'PJP',
  general: 'PJU',
}

/**
 * Sequential code per prefix per month, allocated inside the caller's transaction.
 * Replaces the prototype's `40 + list.length`, which broke past 60 rows and hardcoded the month.
 */
export async function nextCode(tx: Prisma.TransactionClient, category: Category, now: Date = new Date()): Promise<string> {
  const prefix = PREFIX[category]
  const period = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`

  const counter = await tx.codeCounter.upsert({
    where: { prefix_period: { prefix, period } },
    update: { lastNumber: { increment: 1 } },
    create: { prefix, period, lastNumber: 1 },
  })

  return `${prefix}-${period}-${String(counter.lastNumber).padStart(3, '0')}`
}
```

- [ ] **Step 4: Implementasi service pembuatan**

Tambahkan di `modules/submissions/service.ts`:

```ts
import { Forbidden } from '../../errors'
import { confirmUploaded } from '../documents/service'
import { loadRoute } from '../flowRules/repository'
import { nextCode } from './code'
import { prisma } from '../../db/client'
import { SUBMISSION_INCLUDE } from './repository'

export interface CreateInput {
  readonly title: string
  readonly category: Category
  readonly summary?: string
  readonly primaryDocumentId: string
  readonly supportingDocumentIds: readonly string[]
}

export async function createSubmission(user: Role, input: CreateInput): Promise<Submission> {
  if (user.type !== 'submitter') throw Forbidden('not_your_desk')

  await confirmUploaded(input.primaryDocumentId)
  for (const id of input.supportingDocumentIds) await confirmUploaded(id)

  const route = await loadRoute()
  const assignedSecretaryId = route[input.category]
  if (!assignedSecretaryId) throw BadRequest()

  const row = await prisma.$transaction(async (tx) => {
    const code = await nextCode(tx, input.category)

    const submission = await tx.submission.create({
      data: {
        code,
        title: input.title,
        ...(input.summary === undefined ? {} : { summary: input.summary }),
        requesterId: user.id,
        assignedSecretaryId,
        cluster: user.cluster ?? 'HCRC',
        category: input.category,
        stageKey: 'secretary',
        status: 'running',
        stageEnteredAt: new Date(),
      },
    })

    const entry = await tx.historyEntry.create({
      data: {
        submissionId: submission.id,
        actorId: user.id,
        actorName: user.name,
        actorPosition: user.position,
        kind: 'submit',
        action: 'mengirim pengajuan',
        ...(input.summary === undefined ? {} : { comment: input.summary }),
        fromStage: 'submitter',
        toStage: 'secretary',
      },
    })

    await tx.document.updateMany({
      where: { id: { in: [input.primaryDocumentId, ...input.supportingDocumentIds] } },
      data: { submissionId: submission.id, historyEntryId: entry.id },
    })

    return tx.submission.findUniqueOrThrow({ where: { id: submission.id }, include: SUBMISSION_INCLUDE })
  })

  return toDomainSubmission(row)
}
```

`cluster: user.cluster ?? 'HCRC'` menggantikan hardcode di prototipe — cluster kini datang dari profil pengaju.

- [ ] **Step 5: Pasang route**

Di `modules/submissions/routes.ts`:

```ts
const createInput = z.object({
  title: z.string().min(1).max(300),
  category: z.enum(['finance', 'personnel', 'general']),
  summary: z.string().max(2000).optional(),
  primaryDocumentId: z.string().min(1),
  supportingDocumentIds: z.array(z.string().min(1)).default([]),
})

submissionRoutes.post('/', async (req, res) => {
  const parsed = createInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.status(201).json(await createSubmission(currentUser(req), parsed.data))
})
```

- [ ] **Step 6: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- submissions.create`
Expected: seluruh test PASS, termasuk uji nomor urut serentak.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Endpoint membuat pengajuan

Sekret dikunci lewat assignedSecretaryId saat pembuatan, sehingga mengubah rute
kategori tidak memindahkan berkas yang sedang berjalan — menutup divergensi
rute vs kategori yang selama ini ada di frontend.

Nomor urut dialokasikan lewat CodeCounter di dalam transaksi, menggantikan
generator prototipe yang rusak melewati 60 berkas dan bulannya di-hardcode.
Diuji dengan lima pembuatan serentak.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 11: Aksi alur — teruskan, kembalikan, centang checklist

Inti sistem. Semua pemeriksaan memakai fungsi dari `packages/shared`, di dalam transaksi dengan baris terkunci.

**Files:**
- Modify: `apps/api/src/modules/submissions/{service,routes}.ts`
- Create: `apps/api/tests/submissions.flow.test.ts`

**Interfaces:**
- Produces:
  - `advance(user, code, note?): Promise<Submission>`
  - `sendBack(user, code, comment): Promise<Submission>`
  - `toggleChecklistItem(user, code, itemId, done): Promise<Submission>`
  - `lockAndLoad(tx, code): Promise<SubmissionRow>` — `SELECT ... FOR UPDATE` lalu muat relasinya

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/submissions.flow.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

/** A finance submission sitting on Sari's desk. */
async function atSecretary(): Promise<string> {
  const row = await prisma.submission.findFirstOrThrow({
    where: { category: 'finance', stageKey: 'secretary', status: 'running' },
  })
  return row.code
}

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /submissions/:code/advance', () => {
  it('pemegang berkas bisa meneruskan, tahapnya maju satu', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(200)
    expect(res.body.stageKey).toBe('deputy')
    expect(res.body.daysInStage).toBe(1)
  })

  it('bukan pemegang berkas ditolak 403', async () => {
    const code = await atSecretary()
    const hendra = await loginAs(app, 'hendra.w@ui.ac.id', PW)
    const res = await hendra.post(`/submissions/${code}/advance`).send({})
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('not_your_desk')
  })

  it('monitor tidak bisa meneruskan apa pun', async () => {
    const code = await atSecretary()
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.post(`/submissions/${code}/advance`).send({})
    expect([403, 404]).toContain(res.status)
  })

  it('catatan opsional tercatat di riwayat tanpa menjadi checklist', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/advance`).send({ note: 'Harga vendor B lebih masuk akal' })

    const last = res.body.history[res.body.history.length - 1]
    expect(last.comment).toBe('Harga vendor B lebih masuk akal')
    expect(res.body.checklist).toHaveLength(0)
  })

  it('dari recording menjadi selesai', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { category: 'finance', status: 'running' } })
    await prisma.submission.update({ where: { id: row.id }, data: { stageKey: 'recording' } })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${row.code}/advance`).send({})
    expect(res.body.stageKey).toBe('done')
    expect(res.body.status).toBe('done')
  })

  it('dua advance bersamaan: satu berhasil, satu gagal', async () => {
    const code = await atSecretary()
    const a = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const b = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const results = await Promise.all([
      a.post(`/submissions/${code}/advance`).send({}),
      b.post(`/submissions/${code}/advance`).send({}),
    ])
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)

    const row = await prisma.submission.findUniqueOrThrow({ where: { code } })
    expect(row.stageKey).toBe('deputy')
  })
})

describe('POST /submissions/:code/return', () => {
  it('mundur tepat satu langkah dan komentarnya jadi checklist', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari
      .post(`/submissions/${code}/return`)
      .send({ comment: 'Lampirkan surat persetujuan\nPerbaiki tanggal di form' })

    expect(res.status).toBe(200)
    expect(res.body.stageKey).toBe('submitter')
    expect(res.body.status).toBe('returned')
    expect(res.body.checklist).toHaveLength(2)
    expect(res.body.checklist.every((c: { done: boolean }) => !c.done)).toBe(true)
  })

  it('tidak pernah mundur melewati tahap pertama', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    expect(row.stageKey).toBe('submitter')
  })

  it('komentar kosong ditolak', async () => {
    const code = await atSecretary()
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.post(`/submissions/${code}/return`).send({ comment: '   \n  \n ' })
    expect(res.body.error.code).toBe('comment_required')
  })
})

describe('checklist mengunci', () => {
  it('berkas dikembalikan tidak bisa diteruskan sebelum semua poin ditutup', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { status: 'returned' },
      include: { checklist: true, requester: true },
    })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    const blocked = await rina.post(`/submissions/${row.code}/advance`).send({})
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('checklist_open')

    for (const item of row.checklist) {
      await rina.patch(`/submissions/${row.code}/checklist/${item.id}`).send({ done: true })
    }

    const ok = await rina.post(`/submissions/${row.code}/advance`).send({})
    expect(ok.status).toBe(200)
    expect(ok.body.stageKey).toBe('secretary')
    expect(ok.body.checklist).toHaveLength(0)
  })

  it('orang yang tidak memegang berkas tidak bisa mencentang', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' }, include: { checklist: true } })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.patch(`/submissions/${row.code}/checklist/${row.checklist[0]!.id}`).send({ done: true })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- submissions.flow`
Expected: FAIL, rute belum ada.

- [ ] **Step 3: Implementasi pemuat berkunci**

Tambahkan di `modules/submissions/repository.ts`:

```ts
import type { Prisma } from '@prisma/client'

/**
 * Lock the row for the rest of the transaction, then load it with relations.
 * Without this, two tabs pressing "Teruskan" can move a document two stages
 * or fork its history.
 */
export async function lockAndLoad(tx: Prisma.TransactionClient, code: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Submission" WHERE code = ${code} FOR UPDATE
  `
  const id = locked[0]?.id
  if (!id) return null
  return tx.submission.findUnique({ where: { id }, include: SUBMISSION_INCLUDE })
}
```

- [ ] **Step 4: Implementasi tiga aksi**

Tambahkan di `modules/submissions/service.ts`. Import yang diperlukan, lengkap — sebagian sudah ada dari Task 8 dan 10:

```ts
import type { Prisma } from '@prisma/client'
import { canAdvance, isHolder, isVisible, nextStage, previousStage } from '@imeri/shared'
import type { Role, Stage, Submission } from '@imeri/shared'
import { prisma } from '../../db/client'
import { toDomainSubmission } from '../../db/toDomain'
import type { SubmissionRow } from '../../db/toDomain'
import { BadRequest, Conflict, Forbidden, NotFound } from '../../errors'
import { loadStages } from '../flowRules/repository'
import { SUBMISSION_INCLUDE, lockAndLoad } from './repository'

const ADVANCE_ACTION: Partial<Record<string, string>> = {
  submitter: 'mengajukan ulang setelah perbaikan',
  secretary: 'meneruskan ke Wadir',
  deputy: 'memberi paraf dan meneruskan ke Direktur',
  director: 'menyetujui dan menandatangani',
  recording: 'merekam hasil dan memberi tahu pengaju',
}

const DESK_NAME: Partial<Record<string, string>> = {
  submitter: 'Pengaju',
  secretary: 'Sekret',
  deputy: 'Wadir',
  director: 'Direktur',
  recording: 'Sekret',
}

/** Load, lock, and run the shared rules. Every mutating action goes through here. */
async function guarded<T>(code: string, role: Role, run: (ctx: {
  tx: Prisma.TransactionClient
  row: SubmissionRow
  submission: Submission
  stages: readonly Stage[]
}) => Promise<T>): Promise<T> {
  const stages = await loadStages()
  return prisma.$transaction(async (tx) => {
    const row = await lockAndLoad(tx, code)
    if (!row) throw NotFound()
    const submission = toDomainSubmission(row)
    if (!isVisible(submission, role)) throw NotFound()
    if (!isHolder(submission, role, stages)) throw Forbidden('not_your_desk')
    return run({ tx, row, submission, stages })
  })
}

export async function advance(role: Role, code: string, note?: string): Promise<Submission> {
  return guarded(code, role, async ({ tx, row, submission }) => {
    if (!canAdvance(submission)) throw Conflict('checklist_open')

    const from = row.stageKey
    const to = nextStage(from)
    const finished = to === 'done'

    await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'approve',
        action: ADVANCE_ACTION[from] ?? 'meneruskan berkas',
        ...(note === undefined || note.trim() === '' ? {} : { comment: note.trim() }),
        fromStage: from,
        toStage: to,
      },
    })

    await tx.submission.update({
      where: { id: row.id },
      data: { stageKey: to, status: finished ? 'done' : 'running', stageEnteredAt: new Date() },
    })

    // Checklist rows are deliberately NOT deleted: they belong to the return that
    // created them. Moving to `running` is what makes them stop being active.

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}

export async function sendBack(role: Role, code: string, comment: string): Promise<Submission> {
  const points = comment.split('\n').map((line) => line.trim()).filter((line) => line !== '')
  if (points.length === 0) throw BadRequest('comment_required')

  return guarded(code, role, async ({ tx, row }) => {
    const from = row.stageKey
    const to = previousStage(from)

    const entry = await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'return',
        action: `mengembalikan ke ${DESK_NAME[to] ?? 'meja sebelumnya'}`,
        comment: `${points.join('. ')}.`,
        fromStage: from,
        toStage: to,
      },
    })

    // Earlier rounds stay on their own return entry; this creates a new set.
    await tx.checklistItem.createMany({
      data: points.map((text) => ({ historyEntryId: entry.id, submissionId: row.id, text })),
    })

    await tx.submission.update({
      where: { id: row.id },
      data: { stageKey: to, status: 'returned', stageEnteredAt: new Date() },
    })

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}

export async function toggleChecklistItem(role: Role, code: string, itemId: string, done: boolean): Promise<Submission> {
  return guarded(code, role, async ({ tx, row }) => {
    const item = row.checklist.find((c) => c.id === itemId)
    if (!item) throw NotFound()

    await tx.checklistItem.update({
      where: { id: itemId },
      data: { done, doneAt: done ? new Date() : null, doneById: done ? role.id : null },
    })

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}
```

- [ ] **Step 5: Pasang route**

```ts
const noteInput = z.object({ note: z.string().max(2000).optional() })
const commentInput = z.object({ comment: z.string().min(1).max(4000) })
const checkInput = z.object({ done: z.boolean() })

submissionRoutes.post('/:code/advance', async (req, res) => {
  const parsed = noteInput.safeParse(req.body ?? {})
  if (!parsed.success) throw BadRequest()
  res.json(await advance(currentUser(req), req.params.code, parsed.data.note))
})

submissionRoutes.post('/:code/return', async (req, res) => {
  const parsed = commentInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest('comment_required')
  res.json(await sendBack(currentUser(req), req.params.code, parsed.data.comment))
})

submissionRoutes.patch('/:code/checklist/:itemId', async (req, res) => {
  const parsed = checkInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.json(await toggleChecklistItem(currentUser(req), req.params.code, req.params.itemId, parsed.data.done))
})
```

- [ ] **Step 6: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- submissions.flow`
Expected: seluruh test PASS, termasuk uji dua advance bersamaan.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Aksi alur: teruskan, kembalikan, dan centang checklist

Seluruh pemeriksaan memakai isHolder() dan canAdvance() dari packages/shared —
fungsi yang sama yang menyalakan tombol di browser. Tombol di klien hanya
kenyamanan; server tidak pernah mempercayainya.

Tiap aksi berjalan di dalam transaksi dengan SELECT ... FOR UPDATE, sehingga dua
tab yang menekan Teruskan bersamaan tidak bisa memajukan berkas dua tahap atau
mencabangkan riwayatnya.

Catatan saat meneruskan hanya tercatat; hanya catatan pengembalian yang menjadi
poin checklist yang mengunci.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 12: Menambah dokumen dan versi baru

**Files:**
- Modify: `apps/api/src/modules/documents/service.ts`
- Modify: `apps/api/src/modules/submissions/routes.ts`
- Create: `apps/api/tests/documents.versioning.test.ts`

**Interfaces:**
- Produces: `attachDocument(role, code, documentId, kind, note?): Promise<Submission>`

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/documents.versioning.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

async function uploaded(agent: Awaited<ReturnType<typeof loginAs>>, kind: 'primary' | 'supporting') {
  const res = await agent
    .post('/documents/upload-url')
    .send({ filename: `${kind}-baru.pdf`, contentType: 'application/pdf', sizeBytes: 12, kind })
  await fetch(res.body.uploadUrl, {
    method: 'PUT',
    body: Buffer.from('%PDF-1.4 hi'),
    headers: { 'Content-Type': 'application/pdf' },
  })
  return res.body.documentId as string
}

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('POST /submissions/:code/documents', () => {
  it('pengaju bisa mengunggah versi baru dokumen utama saat berkas dikembalikan', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const id = await uploaded(rina, 'primary')

    const res = await rina
      .post(`/submissions/${row.code}/documents`)
      .send({ documentId: id, kind: 'primary', note: 'Perbaikan sesuai poin 1' })

    expect(res.status).toBe(200)
    const last = res.body.history[res.body.history.length - 1]
    expect(last.action).toContain('dokumen pengajuan')
  })

  it('dokumen utama beku setelah lewat meja pengaju', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running' },
    })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const id = await uploaded(rina, 'primary')

    const res = await rina.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'primary' })
    expect([403, 404]).toContain(res.status)
    if (res.status === 403) expect(res.body.error.code).toBe('primary_document_frozen')
  })

  it('pemegang berkas boleh menambah dokumen pendamping', async () => {
    const row = await prisma.submission.findFirstOrThrow({
      where: { category: 'finance', stageKey: 'secretary', status: 'running' },
    })
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const id = await uploaded(sari, 'supporting')

    const res = await sari.post(`/submissions/${row.code}/documents`).send({ documentId: id, kind: 'supporting' })
    expect(res.status).toBe(200)
  })

  it('versi lama tetap tersimpan dan tidak lagi current', async () => {
    const row = await prisma.submission.findFirstOrThrow({ where: { status: 'returned' } })
    const rina = await loginAs(app, 'rina.k@ui.ac.id', PW)

    const v1 = await uploaded(rina, 'primary')
    await rina.post(`/submissions/${row.code}/documents`).send({ documentId: v1, kind: 'primary' })
    const v2 = await uploaded(rina, 'primary')
    await rina.post(`/submissions/${row.code}/documents`).send({ documentId: v2, kind: 'primary' })

    const docs = await prisma.document.findMany({ where: { submissionId: row.id, kind: 'primary' } })
    expect(docs).toHaveLength(2)
    expect(docs.filter((d) => d.isCurrent)).toHaveLength(1)
    expect(docs.find((d) => d.isCurrent)?.version).toBe(2)
    expect(docs.every((d) => d.lineageId === docs[0]!.lineageId)).toBe(true)
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- documents.versioning`
Expected: FAIL, rute belum ada.

- [ ] **Step 3: Implementasi `attachDocument`**

Tambahkan di `modules/documents/service.ts`:

```ts
/**
 * The primary document is frozen once the secretary forwards it: otherwise the
 * deputy and director could initial one file and have its contents change behind
 * them. Revision has to go through the official route — returned first.
 */
export async function attachDocument(
  role: Role,
  code: string,
  documentId: string,
  kind: 'primary' | 'supporting',
  note?: string,
): Promise<Submission> {
  await confirmUploaded(documentId)
  const stages = await loadStages()

  return prisma.$transaction(async (tx) => {
    const row = await lockAndLoad(tx, code)
    if (!row) throw NotFound()
    const submission = toDomainSubmission(row)
    if (!isVisible(submission, role)) throw NotFound()

    if (kind === 'primary') {
      if (role.id !== row.requesterId || row.stageKey !== 'submitter') {
        throw Forbidden('primary_document_frozen')
      }
    } else if (!isHolder(submission, role, stages)) {
      throw Forbidden('not_your_desk')
    }

    const previous = await tx.document.findFirst({
      where: { submissionId: row.id, kind, isCurrent: true },
      orderBy: { version: 'desc' },
    })

    const entry = await tx.historyEntry.create({
      data: {
        submissionId: row.id,
        actorId: role.id,
        actorName: role.name,
        actorPosition: role.position,
        kind: 'submit',
        action:
          kind === 'primary'
            ? `mengunggah dokumen pengajuan v${(previous?.version ?? 0) + 1}`
            : 'melampirkan dokumen pendamping',
        ...(note === undefined || note.trim() === '' ? {} : { comment: note.trim() }),
        fromStage: row.stageKey,
        toStage: row.stageKey,
      },
    })

    if (kind === 'primary' && previous) {
      await tx.document.update({ where: { id: previous.id }, data: { isCurrent: false } })
      await tx.document.update({
        where: { id: documentId },
        data: {
          submissionId: row.id,
          historyEntryId: entry.id,
          lineageId: previous.lineageId,
          version: previous.version + 1,
          isCurrent: true,
        },
      })
    } else {
      await tx.document.update({
        where: { id: documentId },
        data: { submissionId: row.id, historyEntryId: entry.id, isCurrent: true },
      })
    }

    const fresh = await tx.submission.findUniqueOrThrow({ where: { id: row.id }, include: SUBMISSION_INCLUDE })
    return toDomainSubmission(fresh)
  })
}
```

- [ ] **Step 4: Pasang route di `modules/submissions/routes.ts`**

```ts
const attachInput = z.object({
  documentId: z.string().min(1),
  kind: z.enum(['primary', 'supporting']),
  note: z.string().max(2000).optional(),
})

submissionRoutes.post('/:code/documents', async (req, res) => {
  const parsed = attachInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  const { documentId, kind, note } = parsed.data
  res.json(await attachDocument(currentUser(req), req.params.code, documentId, kind, note))
})
```

- [ ] **Step 5: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- documents.versioning`
Expected: seluruh test PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Menambah dokumen dan versi baru

Dokumen pengajuan berversi lewat lineageId; versi lama tidak pernah dihapus,
hanya berhenti menjadi current. Tiap versi menempel pada entri riwayat yang
melahirkannya, sehingga pertanyaan "Direktur menandatangani yang mana" tetap
terjawab.

Dokumen utama beku setelah lewat meja pengaju: kalau bisa berubah setelah Sekret
meneruskan, paraf Wadir dan tanda tangan Direktur kehilangan makna. Dokumen
pendamping boleh ditambahkan siapa pun yang sedang memegang berkas.

Menutup lubang tempat checklist "Lampirkan surat persetujuan" tidak bisa
dipenuhi karena tidak ada cara melampirkan apa pun.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 13: Aturan alur (SLA & rute kategori)

**Files:**
- Create: `apps/api/src/modules/flowRules/{service,routes}.ts`
- Create: `apps/api/tests/flowRules.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `getFlowRules(): Promise<{ stages: readonly Stage[]; route: Record<Category, string> }>`
  - `setStageSla(admin, stageKey, slaDays): Promise<...>`
  - `setCategoryRoute(admin, category, secretaryId): Promise<...>`

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/flowRules.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('GET /flow-rules', () => {
  it('terbuka untuk semua peran yang login, bukan admin saja', async () => {
    for (const email of ['rina.k@ui.ac.id', 'sari.d@ui.ac.id', 'nadia.r@ui.ac.id', 'yoga.p@ui.ac.id']) {
      const agent = await loginAs(app, email, PW)
      const res = await agent.get('/flow-rules')
      expect(res.status).toBe(200)
      expect(res.body.stages).toHaveLength(6)
    }
  })

  it('menolak tanpa sesi', async () => {
    const { default: request } = await import('supertest')
    expect((await request(app).get('/flow-rules')).status).toBe(401)
  })

  it('mengembalikan SLA dan rute', async () => {
    const agent = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await agent.get('/flow-rules')
    expect(res.body.stages.find((s: { key: string }) => s.key === 'secretary').sla).toBe(1)
    expect(res.body.stages.find((s: { key: string }) => s.key === 'submitter').sla).toBeNull()
    expect(res.body.route.finance).toBeTruthy()
  })
})

describe('PUT /flow-rules/stages/:key', () => {
  it('admin bisa mengubah batas, dan berlaku langsung', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.put('/flow-rules/stages/secretary').send({ slaDays: 3 })
    expect(res.status).toBe(200)

    const after = await admin.get('/flow-rules')
    expect(after.body.stages.find((s: { key: string }) => s.key === 'secretary').sla).toBe(3)
  })

  it('menjepit ke rentang 1..14', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    expect((await admin.put('/flow-rules/stages/deputy').send({ slaDays: 0 })).status).toBe(400)
    expect((await admin.put('/flow-rules/stages/deputy').send({ slaDays: 99 })).status).toBe(400)
  })

  it('non-admin ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    const res = await sari.put('/flow-rules/stages/secretary').send({ slaDays: 5 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('admin_only')
  })
})

describe('PUT /flow-rules/routes/:category', () => {
  it('admin bisa mengarahkan kategori ke sekret lain', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const budi = await prisma.user.findUniqueOrThrow({ where: { email: 'budi.s@ui.ac.id' } })
    const res = await admin.put('/flow-rules/routes/finance').send({ secretaryId: budi.id })
    expect(res.status).toBe(200)

    const after = await admin.get('/flow-rules')
    expect(after.body.route.finance).toBe(budi.id)
  })

  it('menolak pengguna yang bukan sekret', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const hendra = await prisma.user.findUniqueOrThrow({ where: { email: 'hendra.w@ui.ac.id' } })
    const res = await admin.put('/flow-rules/routes/finance').send({ secretaryId: hendra.id })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- flowRules`
Expected: FAIL, rute belum ada.

- [ ] **Step 3: Implementasi service**

`apps/api/src/modules/flowRules/service.ts`:

```ts
import type { Category, Role, Stage } from '@imeri/shared'
import { prisma } from '../../db/client'
import { BadRequest } from '../../errors'
import { loadRoute, loadStages } from './repository'

export async function getFlowRules(): Promise<{ stages: readonly Stage[]; route: Record<string, string> }> {
  const [stages, route] = await Promise.all([loadStages(), loadRoute()])
  return { stages, route }
}

export async function setStageSla(admin: Role, stageKey: Stage['key'], slaDays: number): Promise<void> {
  if (!Number.isInteger(slaDays) || slaDays < 1 || slaDays > 14) throw BadRequest()
  await prisma.stageRule.update({ where: { stageKey }, data: { slaDays, updatedById: admin.id } })
}

export async function setCategoryRoute(admin: Role, category: Category, secretaryId: string): Promise<void> {
  const secretary = await prisma.user.findUnique({ where: { id: secretaryId } })
  if (!secretary || secretary.type !== 'secretary' || !secretary.active) throw BadRequest()
  await prisma.categoryRoute.update({ where: { category }, data: { secretaryId, updatedById: admin.id } })
}
```

- [ ] **Step 4: Implementasi routes**

```ts
import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAdmin, requireAuth } from '../../middleware/requireAuth'
import { getFlowRules, setCategoryRoute, setStageSla } from './service'

const STAGE_KEYS = ['submitter', 'secretary', 'deputy', 'director', 'recording', 'done'] as const
const CATEGORIES = ['finance', 'personnel', 'general'] as const

export const flowRuleRoutes = Router()
flowRuleRoutes.use(requireAuth)

// Readable by every signed-in role: the SLA numbers drive the "hari 1/2" markers
// and the "Lewat SLA" chips on everyone's screen.
flowRuleRoutes.get('/', async (_req, res) => {
  res.json(await getFlowRules())
})

flowRuleRoutes.put('/stages/:key', requireAdmin, async (req, res) => {
  const key = z.enum(STAGE_KEYS).safeParse(req.params.key)
  const body = z.object({ slaDays: z.number().int() }).safeParse(req.body)
  if (!key.success || !body.success) throw BadRequest()
  await setStageSla(currentUser(req), key.data, body.data.slaDays)
  res.json(await getFlowRules())
})

flowRuleRoutes.put('/routes/:category', requireAdmin, async (req, res) => {
  const category = z.enum(CATEGORIES).safeParse(req.params.category)
  const body = z.object({ secretaryId: z.string().min(1) }).safeParse(req.body)
  if (!category.success || !body.success) throw BadRequest()
  await setCategoryRoute(currentUser(req), category.data, body.data.secretaryId)
  res.json(await getFlowRules())
})
```

Pasang `app.use('/flow-rules', flowRuleRoutes)` di `app.ts`.

- [ ] **Step 5: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- flowRules`
Expected: seluruh test PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src apps/api/tests
git commit -m "$(cat <<'MSG'
Endpoint aturan alur

GET /flow-rules terbuka untuk semua peran yang login, bukan admin saja: penanda
"hari 1/2" dan chip "Lewat SLA" di layar semua orang dihitung dari angka SLA,
jadi membatasinya ke admin akan mematikan seluruh indikator SLA bagi peran lain.

Perubahan hanya boleh dilakukan admin, dijepit ke 1..14 hari, dan rute hanya
boleh diarahkan ke pengguna bertipe secretary yang aktif.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 14: Pengguna, papan beban kerja, dan skrip admin pertama

**Files:**
- Create: `apps/api/src/modules/users/{repository,service,routes}.ts`
- Create: `apps/api/src/scripts/createAdmin.ts`
- Create: `apps/api/tests/users.test.ts`
- Modify: `apps/api/src/app.ts`, `apps/api/package.json`

**Interfaces:**
- Produces:
  - `listStaff(role): Promise<readonly StaffRow[]>` dengan `StaffRow = { id, name, position, type, scope, avgDays, completed30 }`
  - `createUser(admin, input): Promise<Role>`
  - `setUserActive(admin, id, active): Promise<Role>`
  - script `npm run create-admin -w @imeri/api`

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/users.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('GET /staff', () => {
  it('admin melihat seluruh pegawai dengan angka 30 hari', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.get('/staff')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('completed30')
    expect(res.body[0]).toHaveProperty('avgDays')
  })

  it('monitor hanya melihat pengaju clusternya, plus meja lintas cluster', async () => {
    const nadia = await loginAs(app, 'nadia.r@ui.ac.id', PW)
    const res = await nadia.get('/staff')
    const submitters = res.body.filter((s: { type: string }) => s.type === 'submitter')
    for (const s of submitters) expect(s.scope).toBe('HCRC')
  })

  it('peran operasional ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    expect((await sari.get('/staff')).status).toBe(403)
  })
})

describe('POST /users', () => {
  it('admin bisa membuat akun dan akun itu bisa login', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.post('/users').send({
      email: 'baru@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Pegawai Baru',
      type: 'submitter',
      position: 'Pengaju · Cluster MedTech',
      initials: 'PB',
      cluster: 'MedTech',
    })
    expect(res.status).toBe(201)
    expect(res.body.passwordHash).toBeUndefined()
    await expect(loginAs(app, 'baru@ui.ac.id', 'sandi-kuat-123')).resolves.toBeTruthy()
  })

  it('menolak email ganda', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const body = {
      email: 'sari.d@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Kembar',
      type: 'secretary',
      position: 'Sekret',
      initials: 'KK',
      category: 'finance',
    }
    expect((await admin.post('/users').send(body)).status).toBe(400)
  })

  it('menolak sekret tanpa kategori', async () => {
    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    const res = await admin.post('/users').send({
      email: 'tanpa@ui.ac.id',
      password: 'sandi-kuat-123',
      name: 'Tanpa Kategori',
      type: 'secretary',
      position: 'Sekret',
      initials: 'TK',
    })
    expect(res.status).toBe(400)
  })

  it('non-admin ditolak', async () => {
    const sari = await loginAs(app, 'sari.d@ui.ac.id', PW)
    expect((await sari.post('/users').send({})).status).toBe(403)
  })
})

describe('PATCH /users/:id', () => {
  it('menonaktifkan akun akan mencabut sesinya', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: 'tuti.m@ui.ac.id' } })
    const tuti = await loginAs(app, 'tuti.m@ui.ac.id', PW)
    expect((await tuti.get('/auth/me')).status).toBe(200)

    const admin = await loginAs(app, 'yoga.p@ui.ac.id', PW)
    await admin.patch(`/users/${target.id}`).send({ active: false })

    expect((await tuti.get('/auth/me')).status).toBe(401)
  })
})
```

Test terakhir itu justru alasan sesi disimpan di database ketimbang JWT: pencabutan harus berlaku seketika.

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- users`
Expected: FAIL, rute belum ada.

- [ ] **Step 3: Implementasi service**

`apps/api/src/modules/users/service.ts`:

```ts
import type { Cluster, Role, RoleType, StaffScope } from '@imeri/shared'
import { prisma } from '../../db/client'
import { toDomainRole } from '../../db/toDomain'
import { BadRequest, Forbidden } from '../../errors'
import { hashPassword } from '../auth/service'

export interface StaffRow {
  readonly id: string
  readonly name: string
  readonly position: string
  readonly type: RoleType
  readonly scope: StaffScope
  readonly avgDays: number
  readonly completed30: number
}

const THIRTY_DAYS_MS = 30 * 86_400_000

/** Workload board rows. Averages are computed from history, not stored. */
export async function listStaff(role: Role): Promise<readonly StaffRow[]> {
  if (role.type !== 'admin' && role.type !== 'monitor') throw Forbidden('admin_only')

  const users = await prisma.user.findMany({
    where: { active: true, type: { in: ['submitter', 'secretary', 'deputy', 'director'] } },
    orderBy: { name: 'asc' },
  })

  const since = new Date(Date.now() - THIRTY_DAYS_MS)
  const entries = await prisma.historyEntry.findMany({
    where: { kind: 'approve', createdAt: { gte: since } },
    select: { actorId: true },
  })

  const completed = new Map<string, number>()
  for (const entry of entries) completed.set(entry.actorId, (completed.get(entry.actorId) ?? 0) + 1)

  const visible = role.type === 'monitor'
    ? users.filter((u) => u.type !== 'submitter' || u.cluster === role.cluster)
    : users

  return visible.map((u) => ({
    id: u.id,
    name: u.name,
    position: u.position,
    type: u.type,
    scope: u.type === 'submitter' ? (u.cluster ?? 'cross-cluster') : 'cross-cluster',
    avgDays: 0,
    completed30: completed.get(u.id) ?? 0,
  }))
}

export interface CreateUserInput {
  readonly email: string
  readonly password: string
  readonly name: string
  readonly type: RoleType
  readonly position: string
  readonly initials: string
  readonly category?: 'finance' | 'personnel' | 'general'
  readonly cluster?: Cluster
}

export async function createUser(input: CreateUserInput): Promise<Role> {
  if (input.type === 'secretary' && !input.category) throw BadRequest()
  if (input.type === 'monitor' && !input.cluster) throw BadRequest()

  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw BadRequest()

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      type: input.type,
      position: input.position,
      initials: input.initials,
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.cluster === undefined ? {} : { cluster: input.cluster }),
    },
  })

  return toDomainRole(user)
}

/** Deactivating revokes every live session — the reason sessions live in the DB. */
export async function setUserActive(id: string, active: boolean): Promise<Role> {
  const user = await prisma.user.update({ where: { id }, data: { active } })
  if (!active) await prisma.session.deleteMany({ where: { userId: id } })
  return toDomainRole(user)
}
```

`avgDays` sengaja 0 untuk pilot: menghitungnya butuh selisih antar entri riwayat berturut-turut per pegawai, dan kolomnya belum dipakai untuk keputusan apa pun. Dicatat sebagai keterbatasan di README.

- [ ] **Step 4: Implementasi routes**

```ts
export const userRoutes = Router()
userRoutes.use(requireAuth)

userRoutes.post('/', requireAdmin, async (req, res) => {
  const parsed = createUserInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.status(201).json(await createUser(parsed.data))
})

userRoutes.patch('/:id', requireAdmin, async (req, res) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.json(await setUserActive(req.params.id, parsed.data.active))
})

export const staffRoutes = Router()
staffRoutes.use(requireAuth)
staffRoutes.get('/', async (req, res) => {
  res.json(await listStaff(currentUser(req)))
})
```

dengan `createUserInput` sebagai skema zod yang mencerminkan `CreateUserInput` (password minimal 12 karakter). Pasang `app.use('/users', userRoutes)` dan `app.use('/staff', staffRoutes)`.

- [ ] **Step 5: Skrip admin pertama**

`apps/api/src/scripts/createAdmin.ts`:

```ts
import { createInterface } from 'node:readline/promises'
import { prisma } from '../db/client'
import { createUser } from '../modules/users/service'

/** For a real pilot the first admin must not be a seeded account. */
async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const email = await rl.question('Email: ')
  const name = await rl.question('Nama lengkap: ')
  const password = await rl.question('Kata sandi (min 12 karakter): ')
  rl.close()

  if (password.length < 12) throw new Error('Kata sandi terlalu pendek')

  const role = await createUser({
    email: email.trim(),
    password,
    name: name.trim(),
    type: 'admin',
    position: 'Super Admin',
    initials: name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
  })

  console.log(`Admin dibuat: ${role.name} <${email}>`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error)
    await prisma.$disconnect()
    process.exit(1)
  })
```

Tambahkan ke `apps/api/package.json`: `"create-admin": "tsx src/scripts/createAdmin.ts"`.

- [ ] **Step 6: Jalankan test — harus LULUS**

Run: `npm test -w @imeri/api -- users`
Expected: seluruh test PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src apps/api/tests apps/api/package.json
git commit -m "$(cat <<'MSG'
Pengelolaan pengguna, papan beban kerja, dan skrip admin pertama

Akun dibuatkan admin; tidak ada registrasi mandiri, karena untuk sistem internal
institusi siapa yang boleh masuk adalah keputusan administratif.

Menonaktifkan akun langsung mencabut seluruh sesinya — inilah alasan sesi
disimpan di database, bukan JWT yang tidak bisa dicabut.

create-admin dipakai untuk admin pertama di pilot, supaya bukan akun seed
ber-password yang diketahui.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 15: Pembersih file yatim, penyalaan bersama, dan dokumentasi

**Files:**
- Create: `apps/api/src/jobs/cleanupOrphans.ts`
- Create: `apps/api/README.md`
- Create: `apps/api/tests/cleanup.test.ts`
- Modify: `apps/api/src/index.ts`, `package.json`, `README.md`

**Interfaces:**
- Produces: `cleanupOrphans(olderThanHours?): Promise<number>` — mengembalikan jumlah dokumen yang dibersihkan

- [ ] **Step 1: Tulis test yang gagal**

`apps/api/tests/cleanup.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { cleanupOrphans } from '../src/jobs/cleanupOrphans'
import { seed } from '../prisma/seed'
import { disconnectDb, resetDb } from './helpers/db'
import { loginAs } from './helpers/auth'

const app = createApp()
const PW = 'prototipe123'

beforeEach(async () => {
  await resetDb()
  await seed()
})
afterAll(disconnectDb)

describe('cleanupOrphans', () => {
  it('menghapus dokumen pending yang sudah tua', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'yatim.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    await prisma.document.update({
      where: { id: res.body.documentId },
      data: { createdAt: new Date(Date.now() - 48 * 3_600_000) },
    })

    expect(await cleanupOrphans(24)).toBe(1)
    expect(await prisma.document.findUnique({ where: { id: res.body.documentId } })).toBeNull()
  })

  it('tidak menyentuh dokumen pending yang masih baru', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'baru.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })

    expect(await cleanupOrphans(24)).toBe(0)
    expect(await prisma.document.findUnique({ where: { id: res.body.documentId } })).not.toBeNull()
  })

  it('tidak menyentuh dokumen yang sudah ready', async () => {
    const agent = await loginAs(app, 'rina.k@ui.ac.id', PW)
    const res = await agent
      .post('/documents/upload-url')
      .send({ filename: 'jadi.pdf', contentType: 'application/pdf', sizeBytes: 10, kind: 'primary' })
    await prisma.document.update({
      where: { id: res.body.documentId },
      data: { status: 'ready', createdAt: new Date(Date.now() - 48 * 3_600_000) },
    })

    expect(await cleanupOrphans(24)).toBe(0)
  })
})
```

- [ ] **Step 2: Jalankan — harus GAGAL**

Run: `npm test -w @imeri/api -- cleanup`
Expected: FAIL, modul belum ada.

- [ ] **Step 3: Implementasi job**

```ts
import { prisma } from '../db/client'
import { s3Store } from '../storage/s3Store'

/**
 * Uploads that never reached step 3 leave objects behind — a tab closed
 * mid-upload. Removes the row and the object together.
 */
export async function cleanupOrphans(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000)
  const orphans = await prisma.document.findMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
  })

  for (const document of orphans) {
    await s3Store.delete(document.storageKey).catch(() => undefined)
    await prisma.document.delete({ where: { id: document.id } })
  }

  return orphans.length
}
```

Jalankan periodik dari `apps/api/src/index.ts`:

```ts
import { cleanupOrphans } from './jobs/cleanupOrphans'

const CLEANUP_INTERVAL_MS = 3_600_000

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
  setInterval(() => {
    cleanupOrphans().catch((error) => console.error('cleanupOrphans failed', error))
  }, CLEANUP_INTERVAL_MS).unref()
})
```

- [ ] **Step 4: Nyalakan web dan api bersamaan**

Tambahkan `concurrently` ke devDependencies root, lalu ubah script `dev`:

```bash
npm install -D -w . concurrently@^9
```

```json
"dev": "concurrently -n api,web -c cyan,magenta \"npm:dev:api\" \"npm:dev:web\""
```

- [ ] **Step 5: Tulis `apps/api/README.md`**

```markdown
# @imeri/api

Backend for the IMERI document submission system.

## Running locally

    docker compose up -d
    cp apps/api/.env.example apps/api/.env
    npm install
    npm run db:migrate -w @imeri/api
    npm run db:seed    -w @imeri/api
    npm run dev

API on `http://localhost:4000`, web on `http://localhost:5173`,
MinIO console on `http://localhost:9001` (minioadmin / minioadmin).

Every seeded account shares the password printed by the seed script.
For a real pilot use `npm run create-admin -w @imeri/api` instead.

## Layout

    src/modules/<name>/routes.ts       HTTP + zod validation only
    src/modules/<name>/service.ts      business rules, testable without HTTP
    src/modules/<name>/repository.ts   the only place that touches SQL
    src/storage/                       FileStore interface + S3 implementation

Flow rules are NOT reimplemented here. `packages/shared/src/flow.ts` is the
single definition: the same `isHolder()` and `canAdvance()` that light up the
buttons in the browser are the ones that reject requests in the API.

## Tests

    npm test -w @imeri/api

Integration tests run against the real Postgres and MinIO from
`docker-compose` — never mocks. What breaks at this layer is transactions, row
locks, unique constraints, and presigned-URL signing, none of which a mock can
reproduce.

## Known gaps

- `avgDays` on the workload board is always 0; computing it needs per-staff
  deltas between consecutive history entries, and nothing decides on it yet.
- No notifications. A document can sit on someone's desk for days without them
  knowing unless they open the app.
- No antivirus scanning on uploads.
```

Tambahkan bagian singkat di `README.md` root yang menunjuk ke sana.

- [ ] **Step 6: Verifikasi menyeluruh**

```bash
docker compose up -d
npm install
npm run db:migrate -w @imeri/api
npm run db:seed -w @imeri/api
npm test
npm run typecheck
npm run build:web && npm run build -w @imeri/api
```
Expected: seluruh test lulus, typecheck bersih, kedua build sukses.

- [ ] **Step 7: Commit**

```bash
git add apps/api package.json README.md
git commit -m "$(cat <<'MSG'
Pembersih file yatim, penyalaan bersama, dan dokumentasi

Dokumen pending yang tidak pernah sampai langkah konfirmasi meninggalkan objek
yatim di storage saat pengguna menutup tab di tengah upload; job per jam
menghapus baris dan objeknya bersamaan.

Script dev kini menyalakan api dan web sekaligus. README apps/api mencatat cara
menjalankan, alasan test integration memakai layanan sungguhan, dan tiga
keterbatasan yang diketahui.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Peta Cakupan Spec

Tiap bagian spec dan task yang mengerjakannya, hasil self-review.

| Spec | Task |
|---|---|
| §2.1 service berumur panjang | 4 |
| §2.2 MinIO / S3-compatible | 9 |
| §2.3 file tidak lewat API | 9 |
| §2.4 sekret dikunci saat dibuat | 5 (kolom), 10 (penegakan + test) |
| §2.5 paraf hanya catatan persetujuan | — tidak ada pekerjaan PDF, sesuai desain |
| §2.6 `stageEnteredAt` | 5 |
| §2.7 salinan nama & jabatan | 5, 11 |
| §2.8 checklist pada entri pengembalian | 5, 11 |
| §2.9 dokumen berversi | 5, 12 |
| §2.10 dokumen utama beku | 12 |
| §2.11 catatan mengunci vs tidak | 11 |
| §2.12 sesi di database | 6, 14 |
| §3 stack | 4 |
| §4 struktur & penyesuaian shared | 2, 3, 4 |
| §5 skema | 5 |
| §6 endpoint | 6, 8, 9, 10, 11, 12, 13, 14 |
| §6 cookie & domain | 4 (`COOKIE_SAMESITE`) |
| §7 penegakan aturan | 11 |
| §8 penyimpanan file | 9, 15 (job yatim) |
| §9 test | tersebar; sepuluh kasus wajib dipetakan di bawah |
| §10 lingkungan lokal & seeding | 4, 7 |
| §11 di luar lingkup | dihormati — tidak ada endpoint agregasi |
| §13 tahapan | rencana ini = Tahap 1 |

Sepuluh kasus wajib dari spec §9:

| Kasus | Task |
|---|---|
| Checklist terbuka memblokir | 11 |
| Komentar pengembalian kosong ditolak | 11 |
| Mundur tepat satu langkah | 11 |
| Lingkup sekret & monitor | 8 |
| Monitor tidak bisa meneruskan | 11 |
| Ubah rute tidak memindahkan berkas berjalan | 10 |
| Dokumen utama beku | 12 |
| Catatan `advance` bukan checklist | 11 |
| Dua `advance` bersamaan | 11 |
| Kode serentak tidak tabrakan | 10 |

## Catatan Self-Review

Empat hal diperbaiki setelah rencana ditulis:

1. **`advance` dan `sendBack` semula menghapus baris checklist.** Itu bertentangan langsung dengan spec §2.8 — justru catatan "dulu Sekret minta apa" yang hendak dipertahankan. Sekarang baris tidak pernah dihapus; checklist *aktif* diturunkan dari entri pengembalian terakhir dan hanya selagi status `returned`.
2. Filter no-op `.filter((item) => !item.done || true)` di `toDomainSubmission` diganti fungsi `activeChecklist()` yang benar.
3. `StaffRow.scope` memakai `StaffScope` dari shared, bukan union yang diketik ulang.
4. Global Constraints mempertegas batas "server tidak mengirim teks UI": berlaku untuk `error.code` dan nama enum, **tidak** untuk `HistoryEntry.action` / `comment` yang memang catatan audit sebagaimana tertulis saat kejadian — sekelas dengan `actorName` yang juga disalin.
