# @imeri/web

Antarmuka sistem pengajuan dokumen IMERI.

```
src/
  api/          sambungan ke backend (masih memakai seed lokal)
  components/   komponen lintas halaman + kerangka aplikasi (Layout)
  constants/    data seed: peran, tahapan, pengajuan, pegawai
  helpers/      turunan murni dari data (format, ringkasan pemantauan)
  pages/        satu folder per halaman; komponen khusus halaman di dalamnya
  router/       daftar rute
  stores/       state global (jotai)
  styles/       globals.css — token & kelas komponen
```

Aturan alur yang dipakai bersama backend nanti ada di `packages/shared/src/alur.ts`.
