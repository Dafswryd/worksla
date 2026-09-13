import { Router } from 'express'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { getVisible, listVisible } from './service'

export const submissionRoutes = Router()

submissionRoutes.use(requireAuth)

submissionRoutes.get('/', async (req, res) => {
  res.json(await listVisible(currentUser(req)))
})

submissionRoutes.get('/:code', async (req, res) => {
  res.json(await getVisible(req.params.code, currentUser(req)))
})
