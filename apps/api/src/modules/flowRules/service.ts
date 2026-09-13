import type { Category, Role, Stage } from '@imeri/shared'
import { BadRequest } from '../../errors'
import { userRepo } from '../users/repository'
import { loadRoute, loadStages, updateCategoryRoute, updateStageSla } from './repository'

export async function getFlowRules(): Promise<{ stages: readonly Stage[]; route: Record<string, string> }> {
  const [stages, route] = await Promise.all([loadStages(), loadRoute()])
  return { stages, route }
}

export async function setStageSla(admin: Role, stageKey: Stage['key'], slaDays: number): Promise<void> {
  if (!Number.isInteger(slaDays) || slaDays < 1 || slaDays > 14) throw BadRequest('sla_out_of_range')
  await updateStageSla(stageKey, slaDays, admin.id)
}

/**
 * The route target must be an active secretary — and only that. It deliberately
 * does NOT have to already carry the routed category: re-routing a category to
 * a secretary from another one is the whole point of this screen (a secretary
 * on leave is covered by moving their category elsewhere). Permissions follow
 * `Submission.assignedSecretaryId`, stamped at creation, so a target's own
 * `User.category` never enters the decision. See spec §2.4.
 */
export async function setCategoryRoute(admin: Role, category: Category, secretaryId: string): Promise<void> {
  const secretary = await userRepo.byId(secretaryId)
  if (!secretary || secretary.type !== 'secretary' || !secretary.active) throw BadRequest('route_target_invalid')
  await updateCategoryRoute(category, secretaryId, admin.id)
}
