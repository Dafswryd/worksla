import { describe, expect, it } from 'vitest'
import { daysSince } from '../src/db/toDomain'

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
