import { createHash, randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import type { Role } from '@imeri/shared'
import { toDomainRole } from '../../db/toDomain'
import { env } from '../../env'
import { BadRequest } from '../../errors'
import { authRepo } from './repository'

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, { type: argon2.argon2id })

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

/**
 * Computed once at startup so `signIn` never has to hash it on the request path.
 * Verifying against this hash when the user is missing or inactive costs the
 * same argon2id work as verifying a real password, so the response time does
 * not reveal whether the email exists.
 */
const DUMMY_HASH: Promise<string> = hashPassword('dummy-password-for-constant-time-comparison')

/** The cookie carries the raw token; only its hash is stored, so a DB leak cannot resume sessions. */
const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex')

export interface SessionMeta {
  readonly userAgent?: string
  readonly ip?: string
}

export async function signIn(email: string, password: string, meta: SessionMeta): Promise<{ token: string; role: Role }> {
  const user = await authRepo.userByEmail(email)

  // Always run argon2 verification, even when there is no real hash to check
  // against, so a missing or inactive account takes the same time as a wrong
  // password on a real account — timing cannot reveal which emails exist.
  const ok = await verifyPassword(user && user.active ? user.passwordHash : await DUMMY_HASH, password)

  if (!user || !user.active || !ok) throw BadRequest('invalid_credentials')

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3_600_000)
  await authRepo.createSession({
    id: tokenHash(token),
    userId: user.id,
    expiresAt,
    ...(meta.userAgent === undefined ? {} : { userAgent: meta.userAgent }),
    ...(meta.ip === undefined ? {} : { ip: meta.ip }),
  })

  return { token, role: toDomainRole(user) }
}

export async function roleForToken(token: string): Promise<Role | null> {
  const session = await authRepo.sessionById(tokenHash(token))
  if (!session || session.expiresAt < new Date() || !session.user.active) return null
  return toDomainRole(session.user)
}

export const signOut = (token: string): Promise<unknown> => authRepo.deleteSession(tokenHash(token))
