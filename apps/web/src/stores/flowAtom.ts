import { atom } from 'jotai'
import { DEFAULT_ROUTE } from '@/constants/roles'
import { DEFAULT_STAGES } from '@/constants/stages'
import type { Category, CategoryRoute, Stage } from '@/types'

/**
 * Flow rules the super admin can change at runtime: the deadline for each stage
 * and the category → secretary route. Both are read across every screen, so
 * changing one number is felt immediately on the monitoring board and in the
 * SLA markers on the document list.
 */
export interface FlowState {
  readonly stages: readonly Stage[]
  readonly route: CategoryRoute
}

export const flowAtom = atom<FlowState>({
  stages: DEFAULT_STAGES,
  route: DEFAULT_ROUTE,
})

/** New day limit for one stage, clamped to 1..14. */
export const setStageSla = (state: FlowState, index: number, days: number): FlowState => ({
  ...state,
  stages: state.stages.map((stage, i) =>
    i === index && stage.sla !== null ? { ...stage, sla: Math.min(14, Math.max(1, days)) } : stage,
  ),
})

/** Point one category at a different secretary. Applies to new submissions. */
export const setCategoryRoute = (state: FlowState, category: Category, secretaryId: string): FlowState => ({
  ...state,
  route: { ...state.route, [category]: secretaryId },
})
