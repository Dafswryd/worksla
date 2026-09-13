import type { Category, CategoryRoute, Role } from '@/types'

/** Accounts available in the prototype — six operational desks, three observers. */
export const ROLES: Readonly<Record<string, Role>> = {
  rina: { id: 'rina', name: 'Rina Kartika', type: 'submitter', position: 'Pengaju · Cluster HCRC', initials: 'RK' },
  sari: {
    id: 'sari',
    name: 'Sari Dewi',
    type: 'secretary',
    category: 'finance',
    position: 'Sekret Keuangan',
    initials: 'SD',
  },
  budi: {
    id: 'budi',
    name: 'Budi Santoso',
    type: 'secretary',
    category: 'personnel',
    position: 'Sekret Kepegawaian',
    initials: 'BS',
  },
  tuti: {
    id: 'tuti',
    name: 'Tuti Marlina',
    type: 'secretary',
    category: 'general',
    position: 'Sekret Umum',
    initials: 'TM',
  },
  hendra: { id: 'hendra', name: 'Hendra Wijaya', type: 'deputy', position: 'Wakil Direktur', initials: 'HW' },
  ratna: { id: 'ratna', name: 'Ratna Puspita', type: 'director', position: 'Direktur', initials: 'RP' },
  yoga: { id: 'yoga', name: 'Yoga Pratama', type: 'admin', position: 'Super Admin', initials: 'YP' },
  nadia: {
    id: 'nadia',
    name: 'Nadia Rahma',
    type: 'monitor',
    cluster: 'HCRC',
    position: 'Monitor Cluster HCRC',
    initials: 'NR',
  },
  ferry: {
    id: 'ferry',
    name: 'Ferry Gunawan',
    type: 'monitor',
    cluster: 'MedTech',
    position: 'Monitor Cluster MedTech',
    initials: 'FG',
  },
}

export const OPERATIONAL_ACCOUNTS: readonly string[] = ['rina', 'sari', 'budi', 'tuti', 'hendra', 'ratna']
export const OBSERVER_ACCOUNTS: readonly string[] = ['yoga', 'nadia', 'ferry']

/** Look up a role by id; falls back to the finance secretary when unknown. */
export function roleById(id: string): Role {
  const role = ROLES[id] ?? ROLES['sari']
  if (!role) throw new Error('Role list is empty')
  return role
}

/** Initial category → secretary route. The super admin can change it. */
export const DEFAULT_ROUTE: CategoryRoute = {
  finance: 'sari',
  personnel: 'budi',
  general: 'tuti',
}

export const ALL_CATEGORIES: readonly Category[] = ['finance', 'personnel', 'general']
