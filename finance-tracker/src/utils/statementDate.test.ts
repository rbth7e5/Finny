import { describe, expect, it } from 'vitest'
import {
  calendarDaysBetween,
  datesWithinMatchWindow,
  inferStatementYearFromText,
  parseDdMmmWithYear,
  parseStatementDate,
  toIsoDateString,
} from './statementDate'

describe('parseStatementDate', () => {
  it('parses ISO YYYY-MM-DD as UTC date-only', () => {
    const d = parseStatementDate('2024-01-10')
    expect(d).not.toBeNull()
    expect(toIsoDateString(d!)).toBe('2024-01-10')
  })

  it('parses DD/MM/YYYY', () => {
    const d = parseStatementDate('15/03/2024')
    expect(d).not.toBeNull()
    expect(toIsoDateString(d!)).toBe('2024-03-15')
  })

  it('parses DD MMM YYYY (month name)', () => {
    const d = parseStatementDate('01 Feb 2024')
    expect(d).not.toBeNull()
    expect(toIsoDateString(d!)).toBe('2024-02-01')
  })

  it('returns null for empty or unrecognised text', () => {
    expect(parseStatementDate('')).toBeNull()
    expect(parseStatementDate('not a date')).toBeNull()
  })
})

describe('parseDdMmmWithYear', () => {
  it('parses bare DD MMM with supplied year (UTC)', () => {
    const d = parseDdMmmWithYear('28 FEB', 2026)
    expect(d).not.toBeNull()
    expect(toIsoDateString(d!)).toBe('2026-02-28')
  })

  it('returns null without year context on line', () => {
    expect(parseDdMmmWithYear('28 Feb 2026', 2026)).toBeNull()
  })
})

describe('inferStatementYearFromText', () => {
  it('reads year after DBS STATEMENT DATE', () => {
    expect(inferStatementYearFromText('STATEMENT DATE\n15 Mar 2026')).toBe(2026)
  })

  it('reads year after Statement Date', () => {
    expect(inferStatementYearFromText('Statement Date 12 MAR 2026')).toBe(2026)
  })

  it('reads end year from Period line', () => {
    expect(inferStatementYearFromText('Period: 01 Feb 2026 to 28 Feb 2026')).toBe(2026)
  })

  it('reads year after STATEMENT PRINTED ON (DBS footer)', () => {
    expect(inferStatementYearFromText('STATEMENT PRINTED ON 15 Mar 2026')).toBe(2026)
  })

  it('does not use DD Mon YYYY beyond the header prefix as fallback year', () => {
    const junk = `${'a'.repeat(6000)}01 Feb 2033\n`
    expect(inferStatementYearFromText(junk)).toBeUndefined()
  })
})

describe('calendarDaysBetween', () => {
  it('returns absolute whole-day difference in UTC', () => {
    const a = parseStatementDate('2024-01-01')!
    const b = parseStatementDate('2024-01-06')!
    expect(calendarDaysBetween(a, b)).toBe(5)
    expect(calendarDaysBetween(b, a)).toBe(5)
  })
})

describe('datesWithinMatchWindow', () => {
  it('returns true when either side is unparseable (no date gate)', () => {
    expect(datesWithinMatchWindow('2024-01-01', 'nope', 0)).toBe(true)
    expect(datesWithinMatchWindow('???', '2024-01-01', 0)).toBe(true)
  })

  it('returns true when |delta days| <= window', () => {
    expect(datesWithinMatchWindow('2024-01-01', '2024-01-05', 5)).toBe(true)
    expect(datesWithinMatchWindow('2024-01-01', '2024-01-06', 5)).toBe(true)
  })

  it('returns false when |delta days| > window', () => {
    expect(datesWithinMatchWindow('2024-01-01', '2024-01-07', 5)).toBe(false)
  })
})
