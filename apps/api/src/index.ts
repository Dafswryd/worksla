import { createApp } from './app'
import { env } from './env'
import { authRepo } from './modules/auth/repository'
import { cleanupOrphans } from './jobs/cleanupOrphans'

const CLEANUP_INTERVAL_MS = 3_600_000

async function runPeriodicCleanup(): Promise<void> {
  const removedDocuments = await cleanupOrphans()
  const removedSessions = await authRepo.deleteExpired()
  if (removedDocuments > 0 || removedSessions.count > 0) {
    console.log(`cleanup: ${removedDocuments} dokumen yatim, ${removedSessions.count} sesi kedaluwarsa`)
  }
}

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
  setInterval(() => {
    runPeriodicCleanup().catch((error) => console.error('cleanup job failed', error))
  }, CLEANUP_INTERVAL_MS).unref()
})
