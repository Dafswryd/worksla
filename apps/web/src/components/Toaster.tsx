import { useAtomValue } from 'jotai'
import { Icon } from '@/components/Icon'
import { toastsAtom } from '@/stores/toastAtom'
import type { ToastTone } from '@/stores/toastAtom'
import type { IconName } from '@/types'

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'check',
  error: 'alert',
  info: 'inbox',
}

/** Toast stack in the bottom right; mounted once in the app shell. */
export function Toaster() {
  const toasts = useAtomValue(toastsAtom)
  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="t-ico">
            <Icon name={TONE_ICON[toast.tone]} size={16} strokeWidth={2} />
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
