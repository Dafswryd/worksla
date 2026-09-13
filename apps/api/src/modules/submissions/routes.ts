import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { createSubmission, getVisible, listVisible } from './service'

export const submissionRoutes = Router()

submissionRoutes.use(requireAuth)

const createInput = z.object({
  title: z.string().min(1).max(300),
  category: z.enum(['finance', 'personnel', 'general']),
  summary: z.string().max(2000).optional(),
  primaryDocumentId: z.string().min(1),
  supportingDocumentIds: z.array(z.string().min(1)).default([]),
})

submissionRoutes.get('/', async (req, res) => {
  res.json(await listVisible(currentUser(req)))
})

submissionRoutes.post('/', async (req, res) => {
  const parsed = createInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.status(201).json(await createSubmission(currentUser(req), parsed.data))
})

submissionRoutes.get('/:code', async (req, res) => {
  res.json(await getVisible(req.params.code, currentUser(req)))
})
