# IMERI — Sistem Pengajuan Dokumen

Antarmuka pengajuan dokumen lintas cluster IMERI. Satu berkas berjalan dari
pengaju di cluster → sekret sesuai kategorinya → Wadir (QC + paraf) →
Direktur (tanda tangan) → kembali ke sekret untuk direkam → pengaju diberi tahu.
Penolakan memundurkan berkas **satu langkah**, disertai komentar yang otomatis
menjadi checklist revisi.

## Struktur

Mengikuti struktur monorepo SprintIQ.

```
apps/web            React + Vite + TypeScript (antarmuka)
packages/shared     tipe domain & aturan alur yang dipakai bersama FE/BE
```

`apps/api` belum dibuat — seluruh data masih seed di `apps/web/src/constants`.
Lapisan `apps/web/src/api` sudah disiapkan sebagai sambungan ke backend nanti.

## Menjalankan

```bash
npm install
npm run dev:web        # http://localhost:5173
npm run typecheck
npm run build:web
```

## Peran yang bisa dicoba

Halaman masuk memakai combobox akun; kata sandi tidak diperiksa.

| Peran | Contoh akun | Lingkup |
|---|---|---|
| Pengaju | Rina Kartika | pengajuan yang ia buat |
| Sekret | Sari Dewi / Budi Santoso / Tuti Marlina | satu kategori saja |
| Wadir | Hendra Wijaya | semua kategori, QC + paraf |
| Direktur | Ratna Puspita | tanda tangan akhir |
| Super Admin | Yoga Pratama | semua cluster + ubah aturan alur |
| Monitor Cluster | Nadia Rahma / Ferry Gunawan | satu cluster, hanya membaca |

## Catatan desain

- Token warna, tipografi, dan kelas komponen diambil dari SprintIQ.
  Hanya tiga token biru yang ditimpa warna merek IMERI (`:root` kedua di `globals.css`).
- Batas waktu (SLA) per tahap dan rute kategori → sekret disimpan di
  `stores/alurAtom.ts` dan bisa diubah Super Admin saat aplikasi berjalan.
