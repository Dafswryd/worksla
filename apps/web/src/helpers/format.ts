const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const

/** Dua huruf pertama dari nama depan dan belakang, untuk avatar. */
export function inisial(nama: string): string {
  return nama
    .split(' ')
    .map((kata) => kata.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Nama depan saja — untuk sapaan. */
export const namaDepan = (nama: string): string => nama.split(' ')[0] ?? nama

/** Email institusi yang diturunkan dari nama, untuk mengisi form masuk. */
export function emailDari(nama: string): string {
  const bagian = nama.toLowerCase().split(' ')
  const depan = bagian[0] ?? 'pengguna'
  const belakang = bagian[1]?.charAt(0) ?? 'x'
  return `${depan}.${belakang}@ui.ac.id`
}

/** Cap waktu ringkas bergaya riwayat: "12 Sep · 09.14". */
export function waktuSekarang(): string {
  const kini = new Date()
  const jam = String(kini.getHours()).padStart(2, '0')
  const menit = String(kini.getMinutes()).padStart(2, '0')
  return `${kini.getDate()} ${BULAN[kini.getMonth()] ?? ''} · ${jam}.${menit}`
}

/** Persentase bulat yang aman dari pembagian nol. */
export const persen = (bagian: number, total: number): number => (total === 0 ? 0 : Math.round((bagian / total) * 100))
