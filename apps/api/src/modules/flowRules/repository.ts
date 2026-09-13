import type { Category, Stage } from '@imeri/shared'
import { STAGE_ORDER } from '@imeri/shared'
import { prisma } from '../../db/client'

/** StageRule rows → the shared Stage list, in canonical order. */
export async function loadStages(): Promise<readonly Stage[]> {
  const rows = await prisma.stageRule.findMany()
  const bySla = new Map(rows.map((row) => [row.stageKey, row.slaDays]))
  return STAGE_ORDER.map((key) => ({ key, sla: bySla.get(key) ?? null }))
}

export async function loadRoute(): Promise<Readonly<Record<string, string>>> {
  const rows = await prisma.categoryRoute.findMany()
  return Object.fromEntries(rows.map((row) => [row.category, row.secretaryId]))
}

export async function updateStageSla(
  stageKey: Stage['key'],
  slaDays: number,
  updatedById: string,
): Promise<void> {
  await prisma.stageRule.update({ where: { stageKey }, data: { slaDays, updatedById } })
}

export async function updateCategoryRoute(
  category: Category,
  secretaryId: string,
  updatedById: string,
): Promise<void> {
  await prisma.categoryRoute.update({ where: { category }, data: { secretaryId, updatedById } })
}
