import { isVisible } from '@imeri/shared'
import type { Role, Submission } from '@imeri/shared'
import { toDomainSubmission } from '../../db/toDomain'
import { NotFound } from '../../errors'
import { submissionRepo } from './repository'

/** Scope is always derived from the session — never from a request parameter. */
export async function listVisible(role: Role): Promise<readonly Submission[]> {
  const rows = await submissionRepo.all()
  return rows.map((row) => toDomainSubmission(row)).filter((item) => isVisible(item, role))
}

/** Out of scope reads as missing: 403 would confirm the code exists. */
export async function getVisible(code: string, role: Role): Promise<Submission> {
  const row = await submissionRepo.byCode(code)
  if (!row) throw NotFound()
  const submission = toDomainSubmission(row)
  if (!isVisible(submission, role)) throw NotFound()
  return submission
}
