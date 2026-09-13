import { describe, expect, it } from 'vitest'
import {
  canAdvance,
  checklistCleared,
  isHolder,
  isObserver,
  isOverdue,
  isVisible,
  overdueDays,
} from '../src/flow'
import { STAGE_ORDER, nextStage, previousStage, stageByKey, stageIndexOf } from '../src/stages'
import type { Role, Stage, Submission } from '../src/types'

describe('urutan tahap', () => {
  it('enam tahap dengan urutan tetap', () => {
    expect(STAGE_ORDER).toEqual(['submitter', 'secretary', 'deputy', 'director', 'recording', 'done'])
  })

  it('stageIndexOf mengembalikan posisi', () => {
    expect(stageIndexOf('submitter')).toBe(0)
    expect(stageIndexOf('done')).toBe(5)
  })

  it('nextStage berhenti di tahap terakhir', () => {
    expect(nextStage('submitter')).toBe('secretary')
    expect(nextStage('recording')).toBe('done')
    expect(nextStage('done')).toBe('done')
  })

  it('previousStage berhenti di tahap pertama', () => {
    expect(previousStage('deputy')).toBe('secretary')
    expect(previousStage('submitter')).toBe('submitter')
  })
})

const STAGES: readonly Stage[] = [
  { key: 'submitter', sla: null },
  { key: 'secretary', sla: 1 },
  { key: 'deputy', sla: 2 },
  { key: 'director', sla: 2 },
  { key: 'recording', sla: 1 },
  { key: 'done', sla: null },
]

const rina: Role = { id: 'rina', name: 'Rina', type: 'submitter', position: 'Pengaju', initials: 'RK' }
const sari: Role = { id: 'sari', name: 'Sari', type: 'secretary', position: 'Sekret', initials: 'SD', category: 'finance' }
const budi: Role = { id: 'budi', name: 'Budi', type: 'secretary', position: 'Sekret', initials: 'BS', category: 'personnel' }
const hendra: Role = { id: 'hendra', name: 'Hendra', type: 'deputy', position: 'Wadir', initials: 'HW' }
const ratna: Role = { id: 'ratna', name: 'Ratna Puspita', type: 'director', position: 'Direktur', initials: 'RP' }
const yoga: Role = { id: 'yoga', name: 'Yoga', type: 'admin', position: 'Admin', initials: 'YP' }
const nadia: Role = { id: 'nadia', name: 'Nadia', type: 'monitor', position: 'Monitor', initials: 'NR', cluster: 'HCRC' }

function make(over: Partial<Submission> = {}): Submission {
  return {
    code: 'PJK-2609-001',
    title: 'Contoh',
    requester: 'Rina',
    requesterId: 'rina',
    cluster: 'HCRC',
    category: 'finance',
    createdAt: '1 Sep 2026',
    stageKey: 'secretary',
    daysInStage: 1,
    status: 'running',
    attachments: [],
    checklist: [],
    history: [],
    ...over,
  }
}

describe('stageByKey', () => {
  it('mengembalikan aturan tahap yang diminta', () => {
    expect(stageByKey(STAGES, 'deputy').sla).toBe(2)
    expect(stageByKey(STAGES, 'submitter').sla).toBeNull()
  })

  it('melempar kalau tahapnya tidak dikonfigurasi', () => {
    expect(() => stageByKey([], 'deputy')).toThrow()
  })
})

describe('isObserver', () => {
  it('benar untuk admin dan monitor saja', () => {
    expect(isObserver(yoga)).toBe(true)
    expect(isObserver(nadia)).toBe(true)
    expect(isObserver(sari)).toBe(false)
    expect(isObserver(rina)).toBe(false)
  })
})

describe('isVisible', () => {
  it('pengaju hanya melihat miliknya', () => {
    expect(isVisible(make({ requesterId: 'rina' }), rina)).toBe(true)
    expect(isVisible(make({ requesterId: 'andi' }), rina)).toBe(false)
  })

  it('sekret hanya melihat kategorinya', () => {
    expect(isVisible(make({ category: 'finance' }), sari)).toBe(true)
    expect(isVisible(make({ category: 'personnel' }), sari)).toBe(false)
  })

  it('monitor hanya melihat clusternya', () => {
    expect(isVisible(make({ cluster: 'HCRC' }), nadia)).toBe(true)
    expect(isVisible(make({ cluster: 'MedTech' }), nadia)).toBe(false)
  })

  it('wadir dan admin melihat semuanya', () => {
    expect(isVisible(make({ cluster: 'MedTech', category: 'general' }), hendra)).toBe(true)
    expect(isVisible(make({ cluster: 'MedTech', category: 'general' }), yoga)).toBe(true)
  })
})

describe('isHolder', () => {
  it('berkas selesai tidak dipegang siapa pun', () => {
    expect(isHolder(make({ status: 'done', stageKey: 'done' }), rina, STAGES)).toBe(false)
  })

  it('tahap submitter dipegang pengajunya saja', () => {
    const s = make({ stageKey: 'submitter', requesterId: 'rina' })
    expect(isHolder(s, rina, STAGES)).toBe(true)
    expect(isHolder(s, sari, STAGES)).toBe(false)
  })

  it('tahap secretary dan recording dipegang sekret berkategori sama', () => {
    expect(isHolder(make({ stageKey: 'secretary', category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageKey: 'recording', category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageKey: 'secretary', category: 'finance' }), budi, STAGES)).toBe(false)
  })

  it('tahap deputy dipegang wadir saja', () => {
    expect(isHolder(make({ stageKey: 'deputy' }), hendra, STAGES)).toBe(true)
    expect(isHolder(make({ stageKey: 'deputy' }), ratna, STAGES)).toBe(false)
  })

  it('tahap director dipegang direktur saja', () => {
    expect(isHolder(make({ stageKey: 'director' }), ratna, STAGES)).toBe(true)
    expect(isHolder(make({ stageKey: 'director' }), hendra, STAGES)).toBe(false)
  })

  it('monitor tidak pernah memegang apa pun', () => {
    for (const key of STAGE_ORDER) {
      expect(isHolder(make({ stageKey: key }), nadia, STAGES)).toBe(false)
      expect(isHolder(make({ stageKey: key }), yoga, STAGES)).toBe(false)
    }
  })
})

describe('isOverdue / overdueDays', () => {
  it('tahap tanpa batas tidak pernah terlambat', () => {
    expect(isOverdue(make({ stageKey: 'submitter', daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ stageKey: 'submitter', daysInStage: 99 }), STAGES)).toBe(0)
  })

  it('tepat di batas belum terlambat', () => {
    expect(isOverdue(make({ stageKey: 'secretary', daysInStage: 1 }), STAGES)).toBe(false)
    expect(isOverdue(make({ stageKey: 'secretary', daysInStage: 2 }), STAGES)).toBe(true)
    expect(overdueDays(make({ stageKey: 'secretary', daysInStage: 3 }), STAGES)).toBe(2)
  })

  it('berkas selesai tidak pernah terlambat', () => {
    expect(isOverdue(make({ status: 'done', stageKey: 'secretary', daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ status: 'done', stageKey: 'secretary', daysInStage: 99 }), STAGES)).toBe(0)
  })
})

describe('canAdvance', () => {
  it('checklist kosong berarti boleh maju', () => {
    expect(checklistCleared(make())).toBe(true)
    expect(canAdvance(make())).toBe(true)
  })

  it('berkas dikembalikan terkunci sampai semua poin tertutup', () => {
    const open = make({ status: 'returned', checklist: [{ text: 'a', done: false }] })
    const closed = make({ status: 'returned', checklist: [{ text: 'a', done: true }] })
    expect(canAdvance(open)).toBe(false)
    expect(canAdvance(closed)).toBe(true)
  })

  it('berkas berjalan tidak terkunci walau checklist terbuka', () => {
    const s = make({ status: 'running', checklist: [{ text: 'a', done: false }] })
    expect(canAdvance(s)).toBe(true)
  })
})
