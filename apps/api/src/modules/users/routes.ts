import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAdmin, requireAuth } from '../../middleware/requireAuth'
import { createUser, listStaff, listUsers, setUserActive } from './service'

const ROLE_TYPES = ['submitter', 'secretary', 'deputy', 'director', 'admin', 'monitor'] as const
const CATEGORIES = ['finance', 'personnel', 'general'] as const
const CLUSTERS = ['HCRC', 'MedTech', 'StemCell', 'DrugDevelopment'] as const

// Password minimum mirrors the one enforced in the create-admin script — the
// zod schema is what actually gates the HTTP endpoint, so it must not be
// weaker than the script's own check.
const createUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1),
  type: z.enum(ROLE_TYPES),
  position: z.string().min(1),
  initials: z.string().min(1),
  category: z.enum(CATEGORIES).optional(),
  cluster: z.enum(CLUSTERS).optional(),
})

export const userRoutes = Router()
userRoutes.use(requireAuth)

userRoutes.get('/', requireAdmin, async (req, res) => {
  res.json(await listUsers(currentUser(req)))
})

userRoutes.post('/', requireAdmin, async (req, res) => {
  const parsed = createUserInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.status(201).json(await createUser(parsed.data))
})

userRoutes.patch('/:id', requireAdmin, async (req, res) => {
  const id = z.string().min(1).safeParse(req.params.id)
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body)
  if (!id.success || !parsed.success) throw BadRequest()
  res.json(await setUserActive(id.data, parsed.data.active))
})

export const staffRoutes = Router()
staffRoutes.use(requireAuth)
staffRoutes.get('/', async (req, res) => {
  res.json(await listStaff(currentUser(req)))
})
