import { prisma } from '../../src/db/client'

/** Wipe every table between tests. Order matters: children before parents. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ChecklistItem", "Document", "HistoryEntry", "Submission",
      "Session", "StageRule", "CategoryRoute", "CodeCounter", "User"
    RESTART IDENTITY CASCADE
  `)
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
}
