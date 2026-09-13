import { useCallback } from 'react'
import { atom, useSetAtom } from 'jotai'
import { newId } from '@/utils/id'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  readonly id: string
  readonly message: string
  readonly tone: ToastTone
}

export const toastsAtom = atom<readonly Toast[]>([])

const TOAST_MS = 3600

/** Push one toast; it disappears on its own after a few seconds. */
export const useToast = () => {
  const setToasts = useSetAtom(toastsAtom)
  return useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = newId()
      setToasts((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), TOAST_MS)
    },
    [setToasts],
  )
}
