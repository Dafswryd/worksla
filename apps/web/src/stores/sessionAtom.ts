import { atom } from 'jotai'
import { roleById } from '@/constants/roles'
import type { Role } from '@/types'

/**
 * Prototype session: one active role, no token. Once the backend is ready this
 * atom is filled from `/auth/me` and `roleId` becomes the real user id.
 */
export interface SessionState {
  readonly loggedIn: boolean
  readonly roleId: string
}

export const sessionAtom = atom<SessionState>({ loggedIn: false, roleId: 'sari' })

/** The currently active role. */
export const activeRoleAtom = atom<Role>((get) => roleById(get(sessionAtom).roleId))
