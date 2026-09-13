import type { Category, Cluster, RoleType } from '@prisma/client'
import { prisma } from '../../db/client'

/** Desk types shown on the workload board — admins and monitors are observers, not workers. */
export const STAFF_BOARD_TYPES: readonly RoleType[] = ['submitter', 'secretary', 'deputy', 'director']

export interface NewUser {
  readonly email: string
  readonly passwordHash: string
  readonly name: string
  readonly type: RoleType
  readonly position: string
  readonly initials: string
  readonly category?: Category | undefined
  readonly cluster?: Cluster | undefined
}

export const userRepo = {
  byEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  create: (data: NewUser) =>
    prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        type: data.type,
        position: data.position,
        initials: data.initials,
        ...(data.category === undefined ? {} : { category: data.category }),
        ...(data.cluster === undefined ? {} : { cluster: data.cluster }),
      },
    }),

  setActive: (id: string, active: boolean) => prisma.user.update({ where: { id }, data: { active } }),

  /** Sessions live in the DB precisely so this can happen: cutting them off is immediate, not eventual. */
  deleteSessions: (userId: string) => prisma.session.deleteMany({ where: { userId } }),

  staffBoardUsers: () =>
    prisma.user.findMany({
      where: { active: true, type: { in: [...STAFF_BOARD_TYPES] } },
      orderBy: { name: 'asc' },
    }),

  approvalsSince: (since: Date) =>
    prisma.historyEntry.findMany({
      where: { kind: 'approve', createdAt: { gte: since } },
      select: { actorId: true },
    }),
}
