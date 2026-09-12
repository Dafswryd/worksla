import { useAtomValue } from 'jotai'
import { Icon } from '@/components/Icon'
import { toastsAtom } from '@/stores/toastAtom'
import type { ToastTone } from '@/stores/toastAtom'
import type { IconName } from '@/types'

const IKON_TONE: Record<ToastTone, IconName> = {
  success: 'check',
  error: 'alert',
  info: 'inbox',
}

/** Tumpukan toast di kanan bawah; dipasang sekali di kerangka aplikasi. */
export function Toaster() {
  const toasts = useAtomValue(toastsAtom)
  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="t-ico">
            <Icon name={IKON_TONE[toast.tone]} size={16} strokeWidth={2} />
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
