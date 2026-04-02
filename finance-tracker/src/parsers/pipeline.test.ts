import { describe, expect, it } from 'vitest'
import { UOB_BANK_BILL_PAYMENT, UOB_BANK_HEADER } from '../test/fixtures/statements'
import { runStatementPipeline } from './pipeline'

describe('runStatementPipeline (ENG §7.2 parser contract)', () => {
  it('returns UNKNOWN with warning for unrecognized text', () => {
    const r = runStatementPipeline('no bank markers here', 'imp-x')
    expect(r.sourceType).toBe('UNKNOWN')
    expect(r.transactions).toHaveLength(0)
    expect(r.warnings.some((w) => /unrecognized/i.test(w))).toBe(true)
  })

  it('returns transactions and empty warnings when patterns match', () => {
    const text = `${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`
    const r = runStatementPipeline(text, 'imp-y')
    expect(r.sourceType).toBe('UOB_BANK')
    expect(r.transactions.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings).toHaveLength(0)
  })

  it('warns when source known but no rows extracted', () => {
    const text = `${UOB_BANK_HEADER}\nno bill payment lines`
    const r = runStatementPipeline(text, 'imp-z')
    expect(r.sourceType).toBe('UOB_BANK')
    expect(r.transactions).toHaveLength(0)
    expect(r.warnings.some((w) => /no rows matched/i.test(w))).toBe(true)
  })
})
