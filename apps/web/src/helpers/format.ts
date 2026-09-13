const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const

/** First letter of the first and last name, for avatars. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** First name only — for greetings. */
export const firstName = (name: string): string => name.split(' ')[0] ?? name

/** Institutional email derived from a name, to prefill the login form. */
export function emailFor(name: string): string {
  const parts = name.toLowerCase().split(' ')
  const first = parts[0] ?? 'pengguna'
  const last = parts[1]?.charAt(0) ?? 'x'
  return `${first}.${last}@ui.ac.id`
}

/** Compact history-style timestamp: "12 Sep · 09.14". */
export function nowStamp(): string {
  const now = new Date()
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  return `${now.getDate()} ${MONTHS[now.getMonth()] ?? ''} · ${hour}.${minute}`
}

/** Rounded percentage that is safe against division by zero. */
export const percent = (part: number, total: number): number => (total === 0 ? 0 : Math.round((part / total) * 100))
