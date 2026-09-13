import { Router } from 'express'
import { z } from 'zod'
import { BadRequest } from '../../errors'
import { currentUser, requireAuth } from '../../middleware/requireAuth'
import { downloadUrlFor, requestUpload } from './service'

// C0 (\x00-\x1f) and C1 (\x7f) control characters are rejected here so a
// filename can never carry CR/LF or similar bytes into the Content-Disposition
// header signed later in presignDownload — this is the first of two layers,
// the second being sanitizeFilenameForDisposition in s3Store.ts.
const NO_CONTROL_CHARS = /^[^\x00-\x1f\x7f]*$/

const uploadInput = z.object({
  filename: z.string().min(1).max(255).regex(NO_CONTROL_CHARS, 'nama berkas mengandung karakter kendali'),
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
