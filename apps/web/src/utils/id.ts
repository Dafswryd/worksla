let urutan = 0

/** Id pendek untuk elemen sementara (toast, baris baru). */
export const newId = (): string => {
  urutan += 1
  return `id-${Date.now().toString(36)}-${urutan}`
}
