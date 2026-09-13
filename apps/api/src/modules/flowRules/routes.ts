import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAdmin, requireAuth } from '../../middleware/requireAuth'
import { getFlowRules, setCategoryRoute, setStageSla } from './service'

const STAGE_KEYS = ['submitter', 'secretary', 'deputy', 'director', 'recording', 'done'] as const
const CATEGORIES = ['finance', 'personnel', 'general'] as const

export const flowRuleRoutes = Router()
flowRuleRoutes.use(requireAuth)

// Readable by every signed-in role: the SLA numbers drive the "hari 1/2" markers
// and the "Lewat SLA" chips on everyone's screen.
flowRuleRoutes.get('/', async (_req, res) => {
  res.json(await getFlowRules())
})

flowRuleRoutes.put('/stages/:key', requireAdmin, async (req, res) => {
  const key = z.enum(STAGE_KEYS).safeParse(req.params.key)
  const body = z.object({ slaDays: z.number().int() }).safeParse(req.body)
  if (!key.success || !body.success) throw BadRequest()
  await setStageSla(currentUser(req), key.data, body.data.slaDays)
  res.json(await getFlowRules())
})

flowRuleRoutes.put('/routes/:category', requireAdmin, async (req, res) => {
  const category = z.enum(CATEGORIES).safeParse(req.params.category)
  const body = z.object({ secretaryId: z.string().min(1) }).safeParse(req.body)
  if (!category.success || !body.success) throw BadRequest()
  await setCategoryRoute(currentUser(req), category.data, body.data.secretaryId)
  res.json(await getFlowRules())
})
