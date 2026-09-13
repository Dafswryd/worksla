import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { advance, createSubmission, getVisible, listVisible, sendBack, toggleChecklistItem } from './service'

export const submissionRoutes = Router()

submissionRoutes.use(requireAuth)

const createInput = z.object({
  title: z.string().min(1).max(300),
  category: z.enum(['finance', 'personnel', 'general']),
  summary: z.string().max(2000).optional(),
  primaryDocumentId: z.string().min(1),
  supportingDocumentIds: z.array(z.string().min(1)).default([]),
})

const noteInput = z.object({ note: z.string().max(2000).optional() })
const commentInput = z.object({ comment: z.string().min(1).max(4000) })
const checkInput = z.object({ done: z.boolean() })

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

submissionRoutes.post('/:code/advance', async (req, res) => {
  const parsed = noteInput.safeParse(req.body ?? {})
  if (!parsed.success) throw BadRequest()
  res.json(await advance(currentUser(req), req.params.code, parsed.data.note))
})

submissionRoutes.post('/:code/return', async (req, res) => {
  const parsed = commentInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest('comment_required')
  res.json(await sendBack(currentUser(req), req.params.code, parsed.data.comment))
})

submissionRoutes.patch('/:code/checklist/:itemId', async (req, res) => {
  const parsed = checkInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.json(await toggleChecklistItem(currentUser(req), req.params.code, req.params.itemId, parsed.data.done))
})
