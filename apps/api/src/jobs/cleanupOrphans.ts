import { documentRepo } from '../modules/documents/repository'
import { s3Store } from '../storage/s3Store'

/**
 * Uploads that never reached step 3 leave objects behind — a tab closed
 * mid-upload. Removes the object and the row together.
 *
 * The object goes first and the row only follows if that succeeded. Deleting
 * the row regardless would strip away the one record naming the storage key,
 * leaving the object in the bucket with nothing left to retry it. Keeping the
 * row costs one more sweep an hour later; losing it leaks the object forever.
 */
export async function cleanupOrphans(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000)
  const orphans = await documentRepo.pendingOlderThan(cutoff)

  let removed = 0
  for (const document of orphans) {
    try {
      await s3Store.delete(document.storageKey)
    } catch (error) {
      console.error(`cleanupOrphans: gagal menghapus objek ${document.storageKey}, baris dipertahankan`, error)
      continue
    }
    await documentRepo.delete(document.id)
    removed += 1
  }

  return removed
}
