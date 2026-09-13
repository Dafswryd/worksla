import { describe, expect, it } from 'vitest'
import { daysSince, toDomainSubmission, type SubmissionRow } from '../src/db/toDomain'

describe('daysSince', () => {
  it('hari pertama di satu meja dihitung 1, bukan 0', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-13T08:00:00Z'), now)).toBe(1)
  })

  it('bertambah satu tiap 24 jam penuh', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-12T08:00:00Z'), now)).toBe(2)
    expect(daysSince(new Date('2026-09-11T08:00:00Z'), now)).toBe(3)
  })

  it('tidak pernah negatif', () => {
    const now = new Date('2026-09-13T10:00:00Z')
    expect(daysSince(new Date('2026-09-20T08:00:00Z'), now)).toBe(1)
  })
})

describe('toDomainSubmission — active checklist', () => {
  it('memilih checklist dari entri return terbaru walau history tidak terurut kronologis', () => {
    // history is deliberately passed in DESCENDING createdAt order — the
    // function must not rely on caller-supplied ordering to find "newest".
    const row: SubmissionRow = {
      id: 'sub-1',
      code: 'HCRC-2026-001',
      title: 'Pengajuan uji',
      summary: null,
      requesterId: 'user-requester',
      assignedSecretaryId: 'user-secretary',
      cluster: 'HCRC',
      category: 'general',
      stageKey: 'submitter',
      status: 'returned',
      stageEnteredAt: new Date('2026-09-10T00:00:00Z'),
      createdAt: new Date('2026-09-01T00:00:00Z'),
      requester: { name: 'Budi Requester' },
      documents: [],
      history: [
        {
          id: 'return-newest',
          submissionId: 'sub-1',
          actorId: 'user-secretary',
          actorName: 'Sekretaris',
          actorPosition: 'Sekretaris',
          kind: 'return',
          action: 'Mengembalikan berkas',
          comment: null,
          fromStage: 'secretary',
          toStage: 'submitter',
          createdAt: new Date('2026-09-10T00:00:00Z'),
        },
        {
          id: 'return-older',
          submissionId: 'sub-1',
          actorId: 'user-secretary',
          actorName: 'Sekretaris',
          actorPosition: 'Sekretaris',
          kind: 'return',
          action: 'Mengembalikan berkas',
          comment: null,
          fromStage: 'secretary',
          toStage: 'submitter',
          createdAt: new Date('2026-09-05T00:00:00Z'),
        },
      ],
      checklist: [
        {
          id: 'item-old-1',
          historyEntryId: 'return-older',
          submissionId: 'sub-1',
          text: 'Lampirkan surat lama',
          done: false,
          doneAt: null,
          doneById: null,
        },
        {
          id: 'item-new-1',
          historyEntryId: 'return-newest',
          submissionId: 'sub-1',
          text: 'Lampirkan surat terbaru',
          done: false,
          doneAt: null,
          doneById: null,
        },
      ],
    }

    const submission = toDomainSubmission(row, new Date('2026-09-13T10:00:00Z'))

    expect(submission.checklist).toEqual([{ text: 'Lampirkan surat terbaru', done: false }])
  })
})
