/**
 * HTTP connection. While `VITE_API_BASE` is empty the app runs off the seed data
 * in `constants/`, so the prototype works with no backend at all.
 */
export const apiBase = (): string => import.meta.env['VITE_API_BASE'] ?? ''

export const isApiMode = (): boolean => apiBase() !== ''

export interface ApiError {
  readonly status: number
  readonly message: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!response.ok) {
    const error: ApiError = { status: response.status, message: await response.text() }
    throw error
  }
  return (await response.json()) as T
}

export const http = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
