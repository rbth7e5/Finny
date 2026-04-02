/** Month token (abbrev or full, lowercase) → 0–11 */
const MONTH_MAP: Record<string, number> = (() => {
  const m: Record<string, number> = {}
  const pairs: [string, number][] = [
    ['january', 0],
    ['february', 1],
    ['march', 2],
    ['april', 3],
    ['may', 4],
    ['june', 5],
    ['july', 6],
    ['august', 7],
    ['september', 8],
    ['october', 9],
    ['november', 10],
    ['december', 11],
  ]
  for (const [name, idx] of pairs) {
    m[name] = idx
    m[name.slice(0, 3)] = idx
  }
  m.sept = 8
  return m
})()

function utcDate(y: number, monthIndex0: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex0, day))
}

/**
 * Deterministic parse for common statement date strings (TKT-010).
 * Returns UTC midnight for that calendar day, or null if unknown.
 */
export function parseStatementDate(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const d = Number(m[3])
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null
    const dt = utcDate(y, mo, d)
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo && dt.getUTCDate() === d ? dt : null
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const y = Number(m[3])
    if (month < 0 || month > 11 || day < 1 || day > 31) return null
    const dt = utcDate(y, month, day)
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === month && dt.getUTCDate() === day ? dt : null
  }

  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]+)[\s-]+(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const monKey = m[2].toLowerCase()
    const monthIdx = MONTH_MAP[monKey] ?? MONTH_MAP[monKey.slice(0, 3)]
    if (monthIdx === undefined || day < 1 || day > 31) return null
    const y = Number(m[3])
    const dt = utcDate(y, monthIdx, day)
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === monthIdx && dt.getUTCDate() === day ? dt : null
  }

  return null
}

export function toIsoDateString(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** Whole calendar days apart in UTC (absolute). */
export function calendarDaysBetween(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round(Math.abs(db - da) / 86_400_000)
}

/**
 * When both strings parse, requires |Δdays| <= windowDays.
 * If either does not parse, returns true (do not block matching on noisy PDF lines).
 */
export function datesWithinMatchWindow(
  bankDateStr: string,
  cardDateStr: string,
  windowDays: number,
): boolean {
  const db = parseStatementDate(bankDateStr)
  const dc = parseStatementDate(cardDateStr)
  if (!db || !dc) return true
  return calendarDaysBetween(db, dc) <= windowDays
}
