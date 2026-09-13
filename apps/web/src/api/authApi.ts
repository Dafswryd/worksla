import { roleById } from '@/constants/roles'
import { http, isApiMode } from './http'
import type { Role } from '@/types'

/**
 * Authentication. In the prototype `signIn()` just returns the role picked on
 * the login screen — the password is not checked and there is no token.
 */
export const authApi = {
  signIn: async (roleId: string, password: string): Promise<Role> => {
    if (!isApiMode()) return roleById(roleId)
    return http.post<Role>('/auth/sign-in', { roleId, password })
  },

  me: async (roleId: string): Promise<Role> => {
    if (!isApiMode()) return roleById(roleId)
    return http.get<Role>('/auth/me')
  },
}

export default authApi
