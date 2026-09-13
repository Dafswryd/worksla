import { prisma } from '../db/client'
import { s3Store } from '../storage/s3Store'

/**
 * Uploads that never reached step 3 leave objects behind — a tab closed
 * mid-upload. Removes the row and the object together.
 */
export async function cleanupOrphans(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000)
  const orphans = await prisma.document.findMany({
    where: { status: 'pending', createdAt: { lt: cutoff } },
  })

  for (const document of orphans) {
    await s3Store.delete(document.storageKey).catch(() => undefined)
    await prisma.document.delete({ where: { id: document.id } })
  }

  return orphans.length
}
