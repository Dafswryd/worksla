import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../env'
import { BadRequest } from '../../errors'
import { SESSION_COOKIE, currentUser, requireAuth } from '../../middleware/requireAuth'
import { signIn, signOut } from './service'

const credentials = z.object({ email: z.string().email(), password: z.string().min(1) })

export const authRoutes = Router()

authRoutes.post('/login', async (req, res) => {
  const parsed = credentials.safeParse(req.body)
  if (!parsed.success) throw BadRequest('invalid_credentials')

  const { token, role } = await signIn(parsed.data.email, parsed.data.password, {
    ...(req.get('user-agent') === undefined ? {} : { userAgent: req.get('user-agent') as string }),
    ...(req.ip === undefined ? {} : { ip: req.ip }),
  })

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE,
    maxAge: env.SESSION_TTL_HOURS * 3_600_000,
    path: '/',
  })
  res.json(role)
})

authRoutes.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (token) await signOut(token)
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.status(204).end()
})

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json(currentUser(req))
})
