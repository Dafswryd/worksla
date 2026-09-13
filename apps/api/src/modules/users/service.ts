import type { Cluster, Role, RoleType, StaffScope } from '@imeri/shared'
import { toDomainRole } from '../../db/toDomain'
import { BadRequest, Forbidden, NotFound } from '../../errors'
import { hashPassword } from '../auth/service'
import { userRepo } from './repository'

export interface StaffRow {
  readonly id: string
  readonly name: string
  readonly position: string
  readonly type: RoleType
  readonly scope: StaffScope
  /**
   * Placeholder for the pilot: a true average needs the delta between each
   * staff member's consecutive history entries, and no decision currently
   * depends on this number. Always 0 until that is built.
   */
  readonly avgDays: number
  readonly completed30: number
}

const THIRTY_DAYS_MS = 30 * 86_400_000

/** Workload board rows. Averages are computed from history, not stored. */
export async function listStaff(role: Role): Promise<readonly StaffRow[]> {
  if (role.type !== 'admin' && role.type !== 'monitor') throw Forbidden('admin_only')

  const users = await userRepo.staffBoardUsers()

  const since = new Date(Date.now() - THIRTY_DAYS_MS)
  const entries = await userRepo.approvalsSince(since)

  const completed = new Map<string, number>()
  for (const entry of entries) completed.set(entry.actorId, (completed.get(entry.actorId) ?? 0) + 1)

  // A cluster monitor only watches their own cluster's submitters; the
  // cross-cluster desks (secretary, deputy, director) stay visible to every
  // monitor since a document from any cluster passes through them.
  const visible =
    role.type === 'monitor' ? users.filter((u) => u.type !== 'submitter' || u.cluster === role.cluster) : users

  return visible.map((u) => ({
    id: u.id,
    name: u.name,
    position: u.position,
    type: u.type,
    scope: u.type === 'submitter' ? (u.cluster ?? 'cross-cluster') : 'cross-cluster',
    avgDays: 0,
    completed30: completed.get(u.id) ?? 0,
  }))
}

export interface CreateUserInput {
  readonly email: string
  readonly password: string
  readonly name: string
  readonly type: RoleType
  readonly position: string
  readonly initials: string
  readonly category?: 'finance' | 'personnel' | 'general' | undefined
  readonly cluster?: Cluster | undefined
}

/**
 * Accounts are created by an admin; there is no self-registration route.
 * For an internal institutional system, who may enter is an administrative
 * decision, not something a visitor opts into.
 */
export async function createUser(input: CreateUserInput): Promise<Role> {
  // A secretary without a category cannot be routed anything, and a monitor
  // without a cluster can never see one. Reject rather than create a dead
  // account.
  if (input.type === 'secretary' && !input.category) throw BadRequest('secretary_category_required')
  if (input.type === 'monitor' && !input.cluster) throw BadRequest('monitor_cluster_required')

  // A submitter's cluster is stamped onto every submission they create, and it
  // is what decides which cluster monitor may read those documents. There is no
  // safe default: guessing one files someone's documents where the wrong
  // monitor sees them.
  if (input.type === 'submitter' && !input.cluster) throw BadRequest('submitter_cluster_required')

  const existing = await userRepo.byEmail(input.email)
  if (existing) throw BadRequest('email_taken')

  const user = await userRepo.create({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    name: input.name,
    type: input.type,
    position: input.position,
    initials: input.initials,
    category: input.category,
    cluster: input.cluster,
  })

  return toDomainRole(user)
}

/**
 * Deactivating revokes every live session immediately. This is the reason
 * sessions live in the database rather than in a JWT: for personnel
 * documents, when a laptop is lost or someone leaves, access must be cut at
 * that moment, not whenever a token happens to expire.
 */
export async function setUserActive(id: string, active: boolean): Promise<Role> {
  // An id that matches nothing is a missing account, not a server fault:
  // without this, Prisma's P2025 escapes as a 500.
  const existing = await userRepo.byId(id)
  if (!existing) throw NotFound()

  const user = await userRepo.setActive(id, active)
  if (!active) await userRepo.deleteSessions(id)
  return toDomainRole(user)
}

/**
 * The account list behind the admin screen. Domain `Role` objects only — the
 * Prisma row carries `passwordHash`, and it must never leave this process.
 */
export async function listUsers(role: Role): Promise<readonly Role[]> {
  if (role.type !== 'admin') throw Forbidden('admin_only')
  const users = await userRepo.all()
  return users.map(toDomainRole)
}
