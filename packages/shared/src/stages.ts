import type { Stage, StageKey } from './types.js'

/** The six stages a document passes through, in canonical order. */
export const STAGE_ORDER: readonly StageKey[] = [
  'submitter',
  'secretary',
  'deputy',
  'director',
  'recording',
  'done',
]

export function stageIndexOf(key: StageKey): number {
  const index = STAGE_ORDER.indexOf(key)
  if (index < 0) throw new Error(`Unknown stage: ${key}`)
  return index
}

/** The next stage, clamped at the last one. */
export function nextStage(key: StageKey): StageKey {
  const next = STAGE_ORDER[Math.min(stageIndexOf(key) + 1, STAGE_ORDER.length - 1)]
  if (!next) throw new Error('Stage order is empty')
  return next
}

/** The previous stage, clamped at the first one. */
export function previousStage(key: StageKey): StageKey {
  const previous = STAGE_ORDER[Math.max(stageIndexOf(key) - 1, 0)]
  if (!previous) throw new Error('Stage order is empty')
  return previous
}

/** Look up the rule (SLA) for one stage. */
export function stageByKey(stages: readonly Stage[], key: StageKey): Stage {
  const stage = stages.find((item) => item.key === key)
  if (!stage) throw new Error(`No rule configured for stage: ${key}`)
  return stage
}
