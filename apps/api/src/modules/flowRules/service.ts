import type { Category, Role, Stage } from '@imeri/shared'
import { prisma } from '../../db/client'
import { BadRequest } from '../../errors'
import { loadRoute, loadStages } from './repository'

export async function getFlowRules(): Promise<{ stages: readonly Stage[]; route: Record<string, string> }> {
  const [stages, route] = await Promise.all([loadStages(), loadRoute()])
  return { stages, route }
}

export async function setStageSla(admin: Role, stageKey: Stage['key'], slaDays: number): Promise<void> {
  if (!Number.isInteger(slaDays) || slaDays < 1 || slaDays > 14) throw BadRequest()
  await prisma.stageRule.update({ where: { stageKey }, data: { slaDays, updatedById: admin.id } })
}

export async function setCategoryRoute(admin: Role, category: Category, secretaryId: string): Promise<void> {
  const secretary = await prisma.user.findUnique({ where: { id: secretaryId } })
  if (!secretary || secretary.type !== 'secretary' || !secretary.active) throw BadRequest()
  await prisma.categoryRoute.update({ where: { category }, data: { secretaryId, updatedById: admin.id } })
}
