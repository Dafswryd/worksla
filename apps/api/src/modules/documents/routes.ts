import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { downloadUrlFor, requestUpload } from './service'

const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(['primary', 'supporting']),
})

export const documentRoutes = Router()
documentRoutes.use(requireAuth)

documentRoutes.post('/upload-url', async (req, res) => {
  const parsed = uploadInput.safeParse(req.body)
  if (!parsed.success) throw BadRequest()
  res.json(await requestUpload(currentUser(req), parsed.data))
})

documentRoutes.get('/:id/download-url', async (req, res) => {
  res.json({ url: await downloadUrlFor(req.params.id, currentUser(req)) })
})
