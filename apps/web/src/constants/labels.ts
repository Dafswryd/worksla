import type { Category, StaffScope } from '@/types'

/**
 * Indonesian display labels for the English domain values. Every user-visible
 * string lives on this side of the line; the values themselves stay in English
 * so the code, the API payloads, and the database read the same way.
 */
export const CATEGORY_LABEL: Readonly<Record<Category, string>> = {
  finance: 'Keuangan',
  personnel: 'Kepegawaian',
  general: 'Umum',
}

export const scopeLabel = (scope: StaffScope): string => (scope === 'cross-cluster' ? 'Lintas cluster' : scope)
