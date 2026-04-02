import { describe, expect, it } from 'vitest'
import {
  calendarDaysBetween,
  datesWithinMatchWindow,
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
