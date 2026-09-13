import { prisma } from '../../db/client'

export const authRepo = {
  userByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  userById: (id: string) => prisma.user.findUnique({ where: { id } }),
  createSession: (data: { id: string; userId: string; expiresAt: Date; userAgent?: string; ip?: string }) =>
    prisma.session.create({ data }),
  sessionById: (id: string) => prisma.session.findUnique({ where: { id }, include: { user: true } }),
  deleteSession: (id: string) => prisma.session.deleteMany({ where: { id } }),
  deleteExpired: () => prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
}
