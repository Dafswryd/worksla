/**
 * Sambungan HTTP. Selama `VITE_API_BASE` kosong, aplikasi berjalan dari seed
 * di `constants/` — jadi prototipe bisa dijalankan tanpa backend sama sekali.
 */
export const apiBase = (): string => import.meta.env['VITE_API_BASE'] ?? ''

export const modeApi = (): boolean => apiBase() !== ''

export interface ApiError {
  readonly status: number
  readonly pesan: string
}

async function minta<T>(jalur: string, init?: RequestInit): Promise<T> {
  const respons = await fetch(`${apiBase()}${jalur}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!respons.ok) {
    const galat: ApiError = { status: respons.status, pesan: await respons.text() }
    throw galat
  }
  return (await respons.json()) as T
}

export const http = {
  get: <T,>(jalur: string) => minta<T>(jalur),
  post: <T,>(jalur: string, badan: unknown) =>
    minta<T>(jalur, { method: 'POST', body: JSON.stringify(badan) }),
  patch: <T,>(jalur: string, badan: unknown) =>
    minta<T>(jalur, { method: 'PATCH', body: JSON.stringify(badan) }),
}
