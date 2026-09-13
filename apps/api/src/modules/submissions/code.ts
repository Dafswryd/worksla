import type { Category } from '@imeri/shared'
import type { Prisma } from '@prisma/client'

const PREFIX: Readonly<Record<Category, string>> = {
  finance: 'PJK',
  personnel: 'PJP',
  general: 'PJU',
}

/**
 * Sequential code per prefix per month, allocated inside the caller's transaction.
 * Replaces the prototype's `40 + list.length`, which broke past 60 rows and hardcoded the month.
 */
export async function nextCode(tx: Prisma.TransactionClient, category: Category, now: Date = new Date()): Promise<string> {
  const prefix = PREFIX[category]
  const period = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`

  const counter = await tx.codeCounter.upsert({
    where: { prefix_period: { prefix, period } },
    update: { lastNumber: { increment: 1 } },
    create: { prefix, period, lastNumber: 1 },
  })

  return `${prefix}-${period}-${String(counter.lastNumber).padStart(3, '0')}`
}
