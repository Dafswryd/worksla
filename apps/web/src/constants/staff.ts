import type { Cluster, ClusterStat, DailyPoint, Staff } from '@/types'

export const ALL_CLUSTERS: readonly Cluster[] = ['HCRC', 'MedTech', 'Stem Cell', 'Drug Development']

/**
 * Staff list for the workload board. `avgDays` and `completed30` summarise the
 * last 30 days and will come from the backend later; the "at desk" column is
 * derived from the submission list itself, not from here.
 */
export const STAFF: readonly Staff[] = [
  { name: 'Rina Kartika', type: 'submitter', position: 'Pengaju', scope: 'HCRC', avgDays: 0.9, completed30: 7 },
  { name: 'Andi Prasetyo', type: 'submitter', position: 'Pengaju', scope: 'MedTech', avgDays: 1.4, completed30: 9 },
  { name: 'Lestari Ayu', type: 'submitter', position: 'Pengaju', scope: 'Stem Cell', avgDays: 0.7, completed30: 5 },
  {
    name: 'Dimas Saputra',
    type: 'submitter',
    position: 'Pengaju',
    scope: 'Drug Development',
    avgDays: 1.1,
    completed30: 6,
  },
  {
    name: 'Sari Dewi',
    type: 'secretary',
    position: 'Sekret Keuangan',
    scope: 'cross-cluster',
    avgDays: 0.8,
    completed30: 18,
  },
  {
    name: 'Budi Santoso',
    type: 'secretary',
    position: 'Sekret Kepegawaian',
    scope: 'cross-cluster',
    avgDays: 1.2,
    completed30: 11,
  },
  {
    name: 'Tuti Marlina',
    type: 'secretary',
    position: 'Sekret Umum',
    scope: 'cross-cluster',
    avgDays: 1.9,
    completed30: 9,
  },
  { name: 'Hendra Wijaya', type: 'deputy', position: 'Wadir', scope: 'cross-cluster', avgDays: 2.4, completed30: 31 },
  { name: 'Ratna Puspita', type: 'director', position: 'Direktur', scope: 'cross-cluster', avgDays: 2.8, completed30: 29 },
]

export const CLUSTER_STATS: Readonly<Record<Cluster, ClusterStat>> = {
  HCRC: { avgDays: 5.2, completed30: 14, headcount: 9 },
  MedTech: { avgDays: 6.8, completed30: 11, headcount: 12 },
  'Stem Cell': { avgDays: 4.6, completed30: 8, headcount: 7 },
  'Drug Development': { avgDays: 3.9, completed30: 6, headcount: 5 },
}

/** Movement over the last 14 days: [date, documents in, documents completed]. */
export const DAILY: readonly DailyPoint[] = [
  ['30/8', 3, 2],
  ['31/8', 2, 3],
  ['1/9', 4, 2],
  ['2/9', 5, 3],
  ['3/9', 3, 4],
  ['4/9', 6, 3],
  ['5/9', 2, 5],
  ['6/9', 1, 1],
  ['7/9', 0, 0],
  ['8/9', 5, 4],
  ['9/9', 6, 3],
  ['10/9', 7, 2],
  ['11/9', 4, 5],
  ['12/9', 3, 1],
]
