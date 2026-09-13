import { atom } from 'jotai'

export type InboxTab = 'action' | 'running' | 'returned' | 'done'

export const TAB_TITLE: Readonly<Record<InboxTab, string>> = {
  action: 'Menunggu tindakan Anda',
  running: 'Berjalan di meja lain',
  returned: 'Dikembalikan dengan catatan',
  done: 'Sudah selesai',
}

export const tabAtom = atom<InboxTab>('action')

/** The "create submission" modal is open. */
export const createOpenAtom = atom(false)
