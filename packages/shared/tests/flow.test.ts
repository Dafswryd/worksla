import { describe, expect, it } from 'vitest'
import {
  canAdvance,
  checklistCleared,
  isHolder,
  isObserver,
  isOverdue,
  isVisible,
  overdueDays,
  stageAt,
} from '../src/flow'
import type { Role, Stage, Submission } from '../src/types'

const STAGES: readonly Stage[] = [
  { key: 'submitter', desk: 'Pengaju', action: 'Penyusunan berkas', sla: null },
  { key: 'secretary', desk: 'Sekret', action: 'Verifikasi berkas', sla: 1 },
  { key: 'deputy', desk: 'Wadir', action: 'QC & paraf', sla: 2 },
  { key: 'director', desk: 'Direktur', action: 'Persetujuan', sla: 2 },
  { key: 'recording', desk: 'Sekret', action: 'Rekam & arsip', sla: 1 },
  { key: 'done', desk: 'Pengaju', action: 'Selesai', sla: null },
]

const rina: Role = { id: 'rina', name: 'Rina', type: 'submitter', position: 'Pengaju', initials: 'RK' }
const sari: Role = { id: 'sari', name: 'Sari', type: 'secretary', position: 'Sekret', initials: 'SD', category: 'finance' }
const budi: Role = { id: 'budi', name: 'Budi', type: 'secretary', position: 'Sekret', initials: 'BS', category: 'personnel' }
const hendra: Role = { id: 'hendra', name: 'Hendra', type: 'deputy', position: 'Wadir', initials: 'HW' }
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
    stageIndex: 1,
    daysInStage: 1,
    status: 'running',
    attachments: [],
    checklist: [],
    history: [],
    ...over,
  }
}

describe('stageAt', () => {
  it('menjepit indeks ke rentang yang valid', () => {
    expect(stageAt(STAGES, -5).key).toBe('submitter')
    expect(stageAt(STAGES, 99).key).toBe('done')
    expect(stageAt(STAGES, 2).key).toBe('deputy')
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
    expect(isHolder(make({ status: 'done', stageIndex: 5 }), rina, STAGES)).toBe(false)
  })

  it('tahap submitter dipegang pengajunya saja', () => {
    const s = make({ stageIndex: 0, requesterId: 'rina' })
    expect(isHolder(s, rina, STAGES)).toBe(true)
    expect(isHolder(s, sari, STAGES)).toBe(false)
  })

  it('tahap secretary dan recording dipegang sekret berkategori sama', () => {
    expect(isHolder(make({ stageIndex: 1, category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageIndex: 4, category: 'finance' }), sari, STAGES)).toBe(true)
    expect(isHolder(make({ stageIndex: 1, category: 'finance' }), budi, STAGES)).toBe(false)
  })

  it('monitor tidak pernah memegang apa pun', () => {
    for (let i = 0; i < STAGES.length; i += 1) {
      expect(isHolder(make({ stageIndex: i }), nadia, STAGES)).toBe(false)
      expect(isHolder(make({ stageIndex: i }), yoga, STAGES)).toBe(false)
    }
  })
})

describe('isOverdue / overdueDays', () => {
  it('tahap tanpa batas tidak pernah terlambat', () => {
    expect(isOverdue(make({ stageIndex: 0, daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ stageIndex: 0, daysInStage: 99 }), STAGES)).toBe(0)
  })

  it('tepat di batas belum terlambat', () => {
    expect(isOverdue(make({ stageIndex: 1, daysInStage: 1 }), STAGES)).toBe(false)
    expect(isOverdue(make({ stageIndex: 1, daysInStage: 2 }), STAGES)).toBe(true)
    expect(overdueDays(make({ stageIndex: 1, daysInStage: 3 }), STAGES)).toBe(2)
  })

  it('berkas selesai tidak pernah terlambat', () => {
    expect(isOverdue(make({ status: 'done', stageIndex: 1, daysInStage: 99 }), STAGES)).toBe(false)
    expect(overdueDays(make({ status: 'done', stageIndex: 1, daysInStage: 99 }), STAGES)).toBe(0)
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
