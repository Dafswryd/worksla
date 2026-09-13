import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@imeri/shared'
import { Forbidden, Unauthenticated } from '../errors'
import { roleForToken } from '../modules/auth/service'

export const SESSION_COOKIE = 'imeri_session'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: Role
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (!token) return next(Unauthenticated())

  const role = await roleForToken(token)
  if (!role) return next(Unauthenticated())

  req.user = role
  next()
}

/** Must run after requireAuth. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.type !== 'admin') return next(Forbidden('admin_only'))
  next()
}

/** Reads req.user set by requireAuth; throws rather than returning undefined. */
export function currentUser(req: Request): Role {
  if (!req.user) throw Unauthenticated()
  return req.user
}
