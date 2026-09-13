import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { env } from './env'
import { NotFound } from './errors'
import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './modules/auth/routes'
import { documentRoutes } from './modules/documents/routes'
import { flowRuleRoutes } from './modules/flowRules/routes'
import { submissionRoutes } from './modules/submissions/routes'

export function createApp(): express.Express {
  const app = express()

  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/auth', authRoutes)
  app.use('/submissions', submissionRoutes)
  app.use('/documents', documentRoutes)
  app.use('/flow-rules', flowRuleRoutes)

  app.use((_req, _res, next) => next(NotFound()))
  app.use(errorHandler)

  return app
}
