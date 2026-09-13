# Desain Backend — `apps/api`

- **Tanggal:** 13 September 2026
- **Status:** disetujui, belum diimplementasikan
- **Ruang lingkup:** backend untuk sistem pengajuan dokumen IMERI, sampai tahap pilot internal satu cluster

---

## 1. Konteks

`apps/web` sudah berjalan sebagai prototipe penuh dengan data seed di
`apps/web/src/constants`. Seluruh aturan alur sudah ditulis murni di
`packages/shared/src/flow.ts` — tanpa React, tanpa state global — justru supaya
backend bisa memakainya ulang. Lapisan `apps/web/src/api/` sudah ada sebagai
titik sambung, tapi belum dipanggil dari mana pun.

Dokumen ini merancang `apps/api` yang mengisi tempat itu.

### Target

**Pilot internal yang dipakai satu cluster.** Orang sungguhan memasukkan berkas
asli. Perlu login betulan, upload file nyata, riwayat yang tidak bisa
dipalsukan, dan migrasi database yang rapi.

**Belum** perlu: SSO Universitas Indonesia, tanda tangan digital bersertifikat
(BSrE/Peruri), pemindaian antivirus, retensi arsip formal.

### Kendala yang belum pasti

Kebijakan institusi soal lokasi penyimpanan data **belum ditetapkan**. Karena
isinya dokumen kepegawaian dan keuangan, kemungkinan on-premise diminta di
kemudian hari cukup besar. Desain ini memperlakukan hal itu sebagai kendala
utama: setiap ketergantungan infrastruktur ditaruh di balik batas yang bisa
ditukar lewat environment, bukan lewat penulisan ulang.

---

## 2. Keputusan & alasannya

Bagian ini yang paling penting dipertahankan. Sisa dokumen bisa diturunkan dari
kode; alasan di balik keputusan tidak bisa.

### 2.1 Service Node berumur panjang, bukan serverless

**Keputusan:** `apps/api` adalah proses Express yang berjalan terus, di-deploy
sebagai container.

**Alasan:** ini satu-satunya bentuk yang hari ini bisa jalan di cloud dan nanti
bisa pindah ke server kampus tanpa ditulis ulang. Container + Postgres + MinIO
adalah kombinasi on-premise paling standar. Pendekatan serverless (Vercel
Functions + Postgres managed + Vercel Blob) menanamkan asumsi — tanpa proses
panjang, connection pooling, API storage khas vendor — yang semuanya harus
dibongkar kalau residensi data ternyata mengharuskan on-premise.

**Konsekuensi:** ada satu server yang harus dirawat. Diterima sebagai harga dari
opsionalitas.

### 2.2 MinIO benar, Vercel salah tempat

**Keputusan:** penyimpanan file memakai object store S3-compatible; MinIO untuk
development dan on-premise, S3/R2 kalau nanti ke cloud.

**Alasan:** MinIO tidak bisa dijalankan di Vercel — Vercel tidak punya
filesystem persisten, sedangkan MinIO server stateful yang butuh disk. Tapi itu
bukan masalah, karena `apps/web` adalah SPA Vite, bukan Next.js; di Vercel ia
cuma static hosting. Backend tidak perlu ada di Vercel sama sekali.

### 2.3 File tidak pernah melewati API

**Keputusan:** upload memakai presigned URL. Browser mengirim byte langsung ke
object store.

**Alasan:** Vercel membatasi body request function di sekitar 4,5 MB dan hasil
scan surat mudah melewatinya. Bahkan di VPS tanpa batas itu, mengalirkan file
lewat Node memakai memori dan bandwidth dua kali untuk pekerjaan yang sudah
dikerjakan object store dengan lebih baik.

### 2.4 Sekret dikunci saat pengajuan dibuat

**Keputusan:** `Submission.assignedSecretaryId` diisi dari rute yang berlaku
saat pembuatan dan tidak pernah berubah. Tampilan maupun izin sama-sama
membacanya, dan tidak ada satu pun dari keduanya yang membaca rute terkini.

Wujudnya di kode:

- `isVisible` — `role.type === 'secretary'` → `submission.assignedSecretaryId === role.id`
- `isHolder` untuk tahap `secretary` dan `recording` → syarat yang sama
- `holderOf` di `apps/web` mengambil sekretnya dari `assignedSecretaryId`, bukan
  `route[category]`

`User.category` milik sekret tinggal menjadi keterangan administratif — label
bidang kerjanya — bukan lagi sumber izin.

**Alasan:** di prototipe ada dua sumber kebenaran yang berbeda — layar
menampilkan pemegang lewat `route[category]` (rute terkini), sementara izin
dihitung lewat `submission.category === role.category`. Selama rute belum pernah
diubah keduanya kebetulan sama; begitu Super Admin memindah kategori, layar dan
izin berpisah. Mengunci penugasan menutupnya lewat bentuk data, bukan tambalan.

Yang ditutup persisnya: kalau `finance` dialihkan ke Budi (sekret
kepegawaian), pengajuan finance baru tetap distempel `assignedSecretaryId =
budi`, tetapi aturan lama membuat `isVisible` untuk Budi bernilai salah —
berkasnya mendarat di meja yang tidak ada, sementara Sari masih bisa membaca
dan menekan `advance`/`return` atas berkas yang bukan lagi miliknya.

Ini juga membuat kalimat yang sudah tertulis di layar Aturan Alur — *"Mengubah
rute hanya berlaku untuk pengajuan baru"* — akhirnya benar.

**Trade-off:** kalau seorang sekret cuti atau resign, Super Admin memindahkan
rute kategorinya, dan itu hanya mengenai pengajuan baru — berkas yang sudah
berjalan tetap pada sekret lamanya. Pemindahan manual per berkas tidak masuk
pilot; ditunda sampai kebutuhannya terbukti.

### 2.5 Paraf & tanda tangan hanya catatan persetujuan

**Keputusan:** sistem mencatat siapa menyetujui dan kapan. File PDF tidak
disentuh.

**Alasan:** stempel visual di PDF butuh pustaka manipulasi PDF, penyimpanan
gambar tanda tangan tiap pejabat, dan penanganan PDF hasil scan yang
bermacam-macam. Tanda tangan kriptografis butuh sertifikat resmi dan kebijakan
institusi yang belum ada. Untuk pilot internal, bukti persetujuan yang hidup di
database sudah memadai.

### 2.6 `stageEnteredAt`, bukan `daysInStage`

**Keputusan:** simpan kapan berkas masuk ke satu meja; hitung selisihnya saat
dibaca.

**Alasan:** prototipe menyimpan `hari` sebagai angka mati. Di server itu berarti
harus ada cron yang menaikkannya tiap tengah malam — mesin tambahan yang bisa
gagal diam-diam dan membuat seluruh perhitungan SLA salah tanpa ada yang tahu.
Timestamp menghilangkan cron itu dan selalu akurat.

### 2.7 Riwayat menyimpan salinan nama & jabatan

**Keputusan:** `HistoryEntry` menyimpan `actorId` **dan** `actorName` +
`actorPosition` sebagai salinan saat kejadian.

**Alasan:** kalau Hendra pindah jabatan tahun depan, riwayat lama harus tetap
berbunyi "Hendra Wijaya (Wakil Direktur)", bukan jabatan barunya. Inilah yang
membuat riwayat layak disebut tidak bisa dipalsukan. Tidak ada endpoint update
atau delete untuk tabel ini.

### 2.8 Checklist menggantung pada entri pengembalian

**Keputusan:** `ChecklistItem` merujuk `historyEntryId`, bukan langsung ke
pengajuan.

**Alasan:** di prototipe checklist dihapus begitu berkas diteruskan, sehingga
pertanyaan "dulu Sekret minta perbaikan apa saja?" tidak terjawab. Menautkannya
ke peristiwa pengembalian mempertahankan catatan itu.

### 2.9 Dokumen berversi, dengan dua jenis

**Keputusan:** satu tabel `Document` dengan `kind` (`primary` | `supporting`) dan
mekanisme versi berbasis `lineageId`.

**Alasan:** pilot menuntut pengaju bisa memperbaiki berkas yang dikembalikan.
Tanpa itu, checklist *"Lampirkan surat persetujuan atasan langsung"* jadi janji
kosong — pengaju hanya bisa mencentangnya tanpa pernah bisa melampirkan apa pun.

`lineageId` melayani keduanya dengan satu mekanisme: dokumen pengajuan punya satu
lineage yang tumbuh panjang, dokumen pendamping punya satu lineage per berkas
yang biasanya berhenti di v1.

### 2.10 Dokumen utama beku setelah lewat meja pengaju

**Keputusan:** versi baru `primary` hanya boleh diunggah oleh pengaju, dan hanya
selagi berkas berada di tahap `submitter`. Dokumen `supporting` boleh
ditambahkan oleh siapa pun yang sedang memegang berkas.

**Alasan:** kalau dokumen utama bisa berubah setelah Sekret meneruskan, Wadir dan
Direktur berisiko memberi paraf pada satu berkas lalu isinya berganti di
belakang mereka — persetujuannya jadi tidak bermakna. Revisi harus lewat jalur
resmi: dikembalikan dulu, baru boleh diganti.

### 2.11 Catatan persetujuan tidak mengunci, catatan pengembalian mengunci

**Keputusan:** `advance` menerima catatan opsional yang hanya tercatat.
`return` menuntut catatan, dan tiap barisnya menjadi poin checklist yang
memblokir.

**Alasan:** kalau keduanya disamakan, seorang Wadir yang menulis *"nanti tolong
dicek lagi soal harganya"* sambil tetap menyetujui akan tanpa sengaja memblokir
berkasnya sendiri di meja berikutnya. Yang satu komentar, yang satu perintah
kerja — bentuknya di database sama, artinya berbeda.

### 2.12 Sesi di database, bukan JWT

**Keputusan:** sesi disimpan di tabel `Session`, dirujuk lewat cookie httpOnly.

**Alasan:** JWT tidak bisa dicabut. Untuk berkas kepegawaian, kalau laptop
hilang atau seseorang keluar, admin harus bisa mematikan sesinya saat itu juga.
Menambahkan daftar blokir ke JWT pada dasarnya membuat sesi database dengan nama
lain.

---

## 3. Stack

| | Pilihan |
|---|---|
| Runtime | Node 20+, TypeScript |
| HTTP | **Express 5** |
| Validasi | zod |
| Database | PostgreSQL 17 |
| ORM | **Prisma** |
| Object store | S3-compatible (`@aws-sdk/client-s3`) |
| Hash password | argon2id |
| Test | Vitest + supertest |

Express **5**, bukan 4: di v5 error dari handler `async` otomatis diteruskan ke
error middleware. Di v4 promise yang reject menggantung diam-diam — sumber bug
paling sering di API TypeScript.

---

## 4. Struktur

```
apps/api/
  src/
    index.ts            bootstrap
    env.ts              validasi environment (zod), gagal cepat saat start
    db/
      schema.prisma
      migrations/
      seed.ts
    modules/
      auth/             login, sesi, middleware
      submissions/      routes → service → repository
      flow-rules/       SLA & rute kategori
      documents/        presigned URL, versi
      users/            pengelolaan akun (admin)
    storage/
      FileStore.ts      interface
      s3Store.ts        implementasi S3-compatible
    middleware/         auth, error handler, logging
  tests/
docker-compose.yml
```

Tiap modul disusun **routes → service → repository**. Route hanya mengurus HTTP
dan validasi zod; service memegang aturan bisnis; repository satu-satunya yang
menyentuh SQL. Service bisa dites tanpa menyalakan HTTP, dan repository bisa
diganti tanpa service tahu.

### Penyesuaian pada `packages/shared`

1. Perlu di-build ke `dist/` (tsc biasa, tanpa bundler) dan `exports` di
   `package.json` diarahkan ke sana, supaya Node bisa mengonsumsinya. Sekarang
   ia dipakai sebagai TypeScript mentah lewat alias Vite.

2. Tipe `Stage` diciutkan menjadi `{ key, sla }`. Ternyata `flow.ts` tidak pernah
   menyentuh `desk` maupun `action` — keduanya hanya dipakai komponen UI. Label
   Indonesia ("Sekret" / "Verifikasi berkas") pindah ke peta label di
   `apps/web/src/constants/`, jadi server tidak ikut membawa teks UI.

3. `Cluster` berubah dari `'Stem Cell'` dan `'Drug Development'` menjadi
   `StemCell` dan `DrugDevelopment`, karena enum Prisma tidak boleh mengandung
   spasi. Ditangani seperti `Category` sebelumnya: tambah `CLUSTER_LABEL` di
   `constants/labels.ts`; tampilan di layar tidak berubah.

---

## 5. Skema database

```prisma
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
  category     Category?          // sekret saja
  cluster      Cluster?           // pengaju & monitor
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
}

model Submission {
  id                  String           @id @default(cuid())
  code                String           @unique
  title               String
  summary             String?
  requesterId         String
  assignedSecretaryId String             // dikunci saat dibuat, lihat 2.4
  cluster             Cluster
  category            Category
  stageKey            StageKey
  status              SubmissionStatus
  stageEnteredAt      DateTime           // bukan jumlah hari, lihat 2.6
  createdAt           DateTime         @default(now())

  @@index([assignedSecretaryId, status])
  @@index([cluster, status])
}

model Document {
  id             String       @id @default(cuid())
  submissionId   String
  kind           DocumentKind
  lineageId      String                    // mengelompokkan versi dokumen yang sama
  version        Int
  isCurrent      Boolean
  name           String                    // nama asli, untuk ditampilkan
  contentType    String
  sizeBytes      Int
  storageKey     String       @unique      // dibuat server, berbasis UUID
  status         DocumentStatus
  uploadedById   String
  historyEntryId String?                   // versi ini lahir dari perbaikan yang mana
  createdAt      DateTime     @default(now())

  @@unique([lineageId, version])
  @@index([submissionId, kind, isCurrent])
}

model HistoryEntry {
  id            String    @id @default(cuid())
  submissionId  String
  actorId       String
  actorName     String                     // salinan, lihat 2.7
  actorPosition String                     // salinan
  kind          TrailKind
  action        String
  comment       String?
  fromStage     StageKey
  toStage       StageKey
  createdAt     DateTime  @default(now())
}

model ChecklistItem {
  id             String    @id @default(cuid())
  historyEntryId String                    // lahir dari satu pengembalian, lihat 2.8
  submissionId   String
  text           String
  done           Boolean   @default(false)
  doneAt         DateTime?
  doneById       String?
}

model StageRule {
  stageKey    StageKey @id
  slaDays     Int?
  updatedAt   DateTime @updatedAt
  updatedById String
}

model CategoryRoute {
  category    Category @id
  secretaryId String
  updatedAt   DateTime @updatedAt
  updatedById String
}

model Session {
  id        String   @id                   // hash token
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  userAgent String?
  ip        String?
}

model CodeCounter {
  prefix     String                          // PJK | PJP | PJU
  period     String                          // "YYMM", mis. "2609"
  lastNumber Int

  @@id([prefix, period])
}
```

Relasi Prisma (`@relation`) sengaja diringkas dari sketsa di atas; yang
ditampilkan kolom dan kendalanya.

`CodeCounter` menggantikan generator kode prototipe
(`` `${CODE_PREFIX[category]}-2609-0${40 + list.length}` ``) yang rusak saat
daftar mencapai 60 berkas dan bulannya di-hardcode. Penghitung per prefix per
periode dijalankan di dalam transaksi, dengan `@unique` pada `code` sebagai
jaring pengaman terakhir.

---

## 6. API

| Method | Path | Siapa |
|---|---|---|
| `POST` | `/auth/login` | publik |
| `POST` | `/auth/logout` | terautentikasi |
| `GET` | `/auth/me` | terautentikasi |
| `GET` | `/submissions` | semua — otomatis disaring lingkup perannya |
| `GET` | `/submissions/:code` | semua dalam lingkup |
| `POST` | `/submissions` | pengaju |
| `POST` | `/submissions/:code/advance` | pemegang berkas |
| `POST` | `/submissions/:code/return` | pemegang berkas |
| `PATCH` | `/submissions/:code/checklist/:itemId` | pemegang berkas |
| `POST` | `/documents/upload-url` | terautentikasi |
| `POST` | `/submissions/:code/documents` | sesuai aturan 2.10 |
| `GET` | `/documents/:id/download-url` | dalam lingkup berkasnya |
| `GET` | `/flow-rules` | **semua peran yang login** |
| `PUT` | `/flow-rules/stages/:key` | admin |
| `PUT` | `/flow-rules/routes/:category` | admin |
| `GET` | `/staff` | admin & monitor |
| `GET` `POST` `PATCH` | `/users` | admin |

Tiga bentuk yang disengaja:

**`GET /submissions` tidak menerima parameter "lihat sebagai siapa".** Lingkup
diturunkan dari sesi, di server, lewat `isVisible()`. Klien tidak punya cara
meminta data di luar haknya.

**Berkas di luar lingkup menjawab 404, bukan 403.** 403 memberi tahu bahwa
kodenya ada; untuk berkas kepegawaian, keberadaan berkas itu sendiri sudah
informasi.

**`GET /flow-rules` terbuka untuk semua peran yang login.** Penanda "hari 1/2"
dan chip "Lewat SLA" di layar semua orang dihitung dari angka SLA. Kalau
endpoint ini dibatasi admin, seluruh indikator SLA mati untuk peran lain.

### Catatan per aksi

| Aksi | Catatan | Akibat |
|---|---|---|
| Buat pengajuan | `summary`, opsional | tercatat sebagai uraian awal |
| Teruskan / setujui | opsional | hanya tercatat di riwayat |
| Kembalikan | **wajib**, min. 1 baris | tiap baris jadi poin checklist yang mengunci |
| Unggah versi baru | opsional | tercatat menempel pada versi itu |

`summary` sekarang diketik di modal "Buat pengajuan" lalu dibuang — state-nya ada
di React tapi tidak pernah ikut ke `create()`. Di backend ia tersimpan.

### Bentuk error

```json
{ "error": { "code": "checklist_open", "message": "..." } }
```

`code` berbahasa Inggris dan stabil; **frontend yang memetakannya ke kalimat
Indonesia**, pola yang sama dengan `constants/labels.ts`. Server tidak pernah
mengirim teks UI.

### Cookie & domain

Sesi dibawa cookie `httpOnly` + `Secure`. Nilai `SameSite` bergantung pada
keputusan domain saat deploy, dan itu perlu diputuskan sebelum produksi:

- Frontend dan API di bawah satu domain institusi (`app.imeri.ui.ac.id` dan
  `api.imeri.ui.ac.id`) → sesitus, `SameSite=Lax` cukup. **Lebih disukai**:
  lebih sedikit yang bisa salah dan lebih tahan CSRF.
- Frontend di `*.vercel.app` dengan API di domain lain → lintas-situs, wajib
  `SameSite=None; Secure` plus CORS dengan `credentials`.

Tidak menghalangi pengembangan lokal, tapi memengaruhi pilihan domain nanti.

---

## 7. Penegakan aturan

Tiap endpoint yang mengubah keadaan menjalankan pemeriksaan yang sama, memakai
fungsi yang sama dengan browser:

```ts
const submission = await repo.byCode(code, tx)          // SELECT ... FOR UPDATE
if (!isVisible(submission, user))        throw new NotFound()
if (!isHolder(submission, user, stages)) throw new Forbidden('not_your_desk')
if (!canAdvance(submission))             throw new Conflict('checklist_open')
```

Semuanya di dalam satu transaksi dengan baris terkunci. Ini menutup kasus nyata:
Wadir menekan "Teruskan" di dua tab, atau dua orang membuka berkas yang sama.
Tanpa kunci baris, berkas bisa melompat dua tahap atau riwayatnya bercabang.

Tombol yang menyala di browser adalah **kenyamanan, bukan otorisasi**. Server
tidak pernah mempercayainya. `canAdvance()` yang menonaktifkan tombol saat
checklist belum tuntas adalah fungsi yang sama yang menolak request-nya.

---

## 8. Penyimpanan file

```ts
export interface FileStore {
  presignUpload(key: string, contentType: string): Promise<{ url: string; expiresIn: number }>
  presignDownload(key: string, filename: string, ttlSeconds: number): Promise<string>
  head(key: string): Promise<{ sizeBytes: number; contentType: string } | null>
  delete(key: string): Promise<void>
}
```

Satu implementasi (`s3Store.ts`) melayani MinIO, AWS S3, dan Cloudflare R2.
Berpindah di antaranya adalah mengganti environment:

```bash
S3_ENDPOINT=http://localhost:9000    # kosongkan untuk AWS S3
S3_BUCKET=imeri-dev
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true             # true untuk MinIO
```

`head()` bukan pelengkap: itulah cara server memastikan file benar-benar terunggah
dan mengetahui ukuran aslinya, alih-alih memercayai angka dari klien.

### Alur upload

```
1. Browser  → POST /documents/upload-url   { filename, contentType, sizeBytes }
   Server   ← { documentId, uploadUrl, expiresIn: 300 }
              · validasi contentType terhadap daftar izin
              · storageKey dibuat SERVER: submissions/2026/09/<uuid>/<nama-bersih>
              · baris Document dibuat berstatus `pending`

2. Browser  → PUT <uploadUrl>            byte langsung ke MinIO/S3
              · tidak menyentuh API

3. Browser  → POST /submissions
              { title, category, summary?,
                primaryDocumentId,           // tepat satu, wajib
                supportingDocumentIds[] }    // boleh kosong
              atau POST /submissions/:code/documents { documentId, kind, note? }
   Server     · head() tiap key: ada? ukurannya wajar?
              · yang lolos ditandai `ready` dan ditautkan
              · yang gagal ditolak, objeknya dihapus
```

### Pengerasan

- **`storageKey` selalu dibuat server**, tidak pernah dari klien. Nama asli
  disimpan di kolom `name` untuk ditampilkan; kunci penyimpanan berbasis UUID.
  Ini mematikan path traversal, tabrakan nama, karakter aneh hasil scan, dan satu
  pengguna menimpa file pengguna lain — sekaligus.
- **Bucket private, selamanya.** Tidak ada objek yang bisa dibaca tanpa URL
  bertanda tangan. `presignDownload` berumur 60 detik dan hanya diterbitkan
  setelah pemeriksaan `isVisible()`.
- Pembatasan ukuran memakai presigned **PUT** + verifikasi `head()`, objek
  kelewat besar dihapus. Presigned **POST** dengan `content-length-range` lebih
  ketat dan bisa dipasang belakangan tanpa mengubah bentuk API.

### Pekerjaan terjadwal

Satu job menghapus `Document` berstatus `pending` yang berumur lebih dari 24 jam
beserta objeknya — pengguna menutup tab di tengah upload. Ini satu-satunya ops
tambahan yang dibawa bagian ini.

---

## 9. Test

Proyek ini sekarang **nol test** — tidak ada runner, tidak ada satu pun file
test. Selama isinya seed itu wajar; dengan database dan berkas asli, tidak lagi.

**1. `packages/shared/flow.ts` — unit test murni.** Imbal hasil tertinggi: tanpa
I/O, cepat, dan satu bug di sini muncul di browser *dan* server sekaligus.

**2. Service — integration test terhadap Postgres sungguhan.** Bukan Prisma yang
di-mock. Yang sebenarnya rusak di lapis ini adalah transaksi, kunci baris,
unique constraint, dan cascade — persis yang mock tidak bisa tirukan. Tiap test
di dalam transaksi yang di-rollback.

**3. Route — supertest ke app Express**, tetap dengan DB asli. Secukupnya: 401,
404 di luar lingkup, 403 bukan pemegang, 409 checklist terbuka.

**4. `FileStore` — terhadap MinIO di docker-compose.** Penandatanganan presigned
URL justru bagian yang diam-diam berbeda antar implementasi.

Tidak mengejar persentase coverage. Yang dikejar daftar kasus berikut — dan
daftar inilah yang mengunci keputusan di bagian 2:

- [ ] Tidak bisa diteruskan selagi ada poin checklist terbuka
- [ ] Pengembalian dengan komentar kosong ditolak
- [ ] Pengembalian mundur tepat satu langkah, tidak pernah ke awal
- [ ] Sekret hanya melihat kategorinya; Monitor hanya melihat clusternya
- [ ] Monitor tidak bisa meneruskan apa pun
- [ ] **Admin mengubah rute tidak memindahkan berkas yang sedang berjalan** (2.4)
- [ ] **Dokumen `primary` tidak bisa diganti setelah lewat meja pengaju** (2.10)
- [ ] **Catatan `advance` tidak pernah menjadi poin checklist** (2.11)
- [ ] Dua `advance` bersamaan → satu berhasil, satu dapat 409
- [ ] Pembuatan kode serentak tidak pernah tabrakan

---

## 10. Lingkungan lokal

```yaml
# docker-compose.yml
services:
  db:         postgres:17     → 5432
  minio:      minio/minio     → 9000 (API), 9001 (console)
  minio-init: minio/mc        → sekali jalan, membuat bucket
```

`minio-init` bukan hiasan: tanpa dia, jalan pertama gagal dengan pesan
membingungkan karena bucket-nya belum ada.

`env.ts` memvalidasi environment dengan zod saat boot dan **berhenti kalau ada
yang kurang.** Lebih baik server menolak menyala dengan pesan "S3_BUCKET tidak
diisi" daripada menyala lalu gagal saat orang pertama mengunggah file.

```bash
docker compose up -d
npm install
npm run db:migrate -w @imeri/api
npm run db:seed    -w @imeri/api
npm run dev                      # web + api bersamaan
```

Script `dev` di root perlu diubah supaya menyalakan keduanya.

### Seeding

Seed yang sudah ada (`SUBMISSION_SEED`, `ROLES`, `STAFF`) dipindahkan menjadi
skrip seed Prisma. Nilainya bukan sekadar mengisi data: database awal
mereproduksi persis apa yang prototipe tampilkan, jadi saat frontend dialihkan,
tiap layar bisa dibandingkan berdampingan dengan versi seed. Yang berbeda berarti
bug, bukan tebak-tebakan.

Dua pengaman:

- Akun seed berbagi password development yang dicetak saat seeding, dan skripnya
  **menolak jalan kalau `NODE_ENV=production`**.
- Skrip terpisah `create-admin` menanyakan email dan password, supaya admin
  pertama di pilot bukan akun seed.

---

## 11. Di luar lingkup

Sengaja **tidak** masuk desain ini:

- **Endpoint agregasi papan pemantauan.** `summarize()`, `backlogByStage()`, dan
  `workloadRows()` di frontend sudah menghitung semuanya dari daftar berkas.
  Untuk skala pilot itu cukup, dan menghindari logika kembar. Ditambahkan kalau
  nanti terasa lambat.
- SSO Universitas Indonesia
- Tanda tangan digital bersertifikat (BSrE/Peruri)
- Pemindaian antivirus untuk file yang diunggah
- Notifikasi email
- Pemindahan berkas antar sekret saat cuti/resign
- Retensi dan pemusnahan arsip

---

## 12. Keterbatasan yang diketahui

1. **Berkas macet kalau pemegangnya tidak tersedia.** Konsekuensi langsung dari
   2.4. Belum ada jalan keluar administratif selain mengubah data manual.
2. **Kebijakan residensi data belum ditetapkan.** Desain ini menyiapkan
   kepindahan, tapi keputusannya tetap harus datang dari institusi.
3. **Belum ada notifikasi.** Alur menyebut "beri tahu pengaju", tapi
   pemberitahuannya hanya muncul di layar orang yang sedang membuka aplikasi.

---

## 13. Tahapan

Tiga tahap yang berbeda sifatnya, sengaja tidak digabung:

1. **Backend berdiri dan teruji** — cakupan dokumen ini.
2. **Frontend dialihkan ke API** — mengganti `submissionsAtom` yang statis
   dengan pengambilan data, menangani loading dan error, mengubah aksi menjadi
   optimistic update. Lapisan `apps/web/src/api/` sekarang kode mati: `isApiMode()`
   sudah ada, tapi tidak satu pun komponen memanggilnya. Ini bukan "tinggal isi
   env var".
3. **UI dokumen berversi & field catatan** — dokumen pengajuan dengan penanda
   versi dan riwayatnya, dokumen pendamping, tombol unggah yang muncul sesuai
   hak, serta field catatan opsional di footer drawer.

Rencana implementasi terperinci menyusul terpisah.
