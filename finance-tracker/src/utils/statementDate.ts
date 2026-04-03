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

/**
 * UOB card PDFs often use post/trans lines like "28 FEB" without a year.
 * Pair with `inferStatementYearFromText` from the statement header.
 */
export function parseDdMmmWithYear(raw: string, year: number): Date | null {
  const s = raw.trim()
  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})$/i)
  if (!m) return null
  const day = Number(m[1])
  const monKey = m[2].toLowerCase()
  const monthIdx = MONTH_MAP[monKey] ?? MONTH_MAP[monKey.slice(0, 3)]
  if (monthIdx === undefined || day < 1 || day > 31) return null
  const dt = utcDate(year, monthIdx, day)
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === monthIdx && dt.getUTCDate() === day ? dt : null
}

/** Best-effort calendar year for bare `DD MMM` lines (UOB/DBS card PDFs). Order: DBS before UOB so both can appear in one blob. */
export function inferStatementYearFromText(text: string): number | undefined {
  const mDbs = text.match(/STATEMENT\s+DATE[\s\S]{0,220}?(\d{1,2}\s+[A-Za-z]{3,}\s+(\d{4}))/i)
  if (mDbs) return Number(mDbs[2])
  const m = text.match(/Statement\s+Date[\s\S]{0,220}?(\d{1,2}\s+[A-Za-z]{3,}\s+(\d{4}))/i)
  if (m) return Number(m[2])
  const m2 = text.match(
    /Period:\s*\d{1,2}\s+\w+\s+\d{4}\s+to\s+\d{1,2}\s+\w+\s+(\d{4})/i,
  )
  if (m2) return Number(m2[1])
  const mPrinted = text.match(
    /STATEMENT\s+PRINTED\s+ON[\s\S]{0,120}?(\d{1,2}\s+[A-Za-z]{3,}\s+(\d{4}))/i,
  )
  if (mPrinted) return Number(mPrinted[2])
  // Last resort: first DD Mon YYYY only in the header-ish prefix (avoid footnotes / terms later in the PDF).
  const head = text.slice(0, 6000)
  const m3 = head.match(/(\d{1,2}\s+[A-Za-z]{3,}\s+(\d{4}))\b/)
  if (m3) return Number(m3[2])
  return undefined
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
