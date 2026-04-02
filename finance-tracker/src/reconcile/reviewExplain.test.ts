import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/types'
import {
  explainReviewBankItem,
  explainReviewItem,
  formatCardTokenHint,
  reviewItemDetailLines,
} from './reviewExplain'

const profile = { matchWindowDays: 5, confidenceThreshold: 0.75 }

function bank(p: Partial<Transaction> & { id: string; amount: number }): Transaction {
  return {
    importId: 'ib',
    sourceType: 'DBS_BANK',
    kind: 'BANK_SETTLEMENT',
    date: '2024-01-01',
    description: 'DBSC-4111111111111111',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
    ...p,
  }
}

function card(p: Partial<Transaction> & { id: string; amount: number }): Transaction {
  return {
    importId: 'ic',
    sourceType: 'DBS_CARD',
    kind: 'CARD_CREDIT',
    date: '2024-01-02',
    description: 'payment',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
    ...p,
  }
}

describe('explainReviewBankItem (TKT-014)', () => {
  it('NO_COUNTERPART_IN_WINDOW when amount does not match any card', () => {
    const b = bank({ id: 'b1', amount: 99 })
    const c = card({ id: 'c1', amount: 100 })
    const x = explainReviewBankItem(b, [b, c], profile)
    expect(x.code).toBe('NO_COUNTERPART_IN_WINDOW')
    expect(x.codeLabel).toMatch(/counterpart/i)
  })

  it('DATE_OUTSIDE_MATCH_WINDOW when same amount exists but outside window', () => {
    const b = bank({ id: 'b1', amount: 100, date: '2024-01-01' })
    const c = card({ id: 'c1', amount: 100, date: '2024-01-20' })
    const x = explainReviewBankItem(b, [b, c], { ...profile, matchWindowDays: 5 })
    expect(x.code).toBe('DATE_OUTSIDE_MATCH_WINDOW')
  })

  it('LOW_CONFIDENCE when in-window candidate but below threshold', () => {
    const b = bank({ id: 'b1', amount: 200, reference: undefined })
    const c = card({ id: 'c1', amount: 200, reference: undefined })
    const x = explainReviewBankItem(b, [b, c], { ...profile, confidenceThreshold: 0.75 })
    expect(x.code).toBe('LOW_CONFIDENCE')
    expect(x.bestScore).toBeCloseTo(0.6, 5)
  })

  it('AMBIGUOUS_CANDIDATES when two top scores tie within gap', () => {
    const b = bank({ id: 'b1', amount: 50, reference: 'X' })
    const c1 = card({ id: 'c1', amount: 50, reference: 'A' })
    const c2 = card({ id: 'c2', amount: 50, reference: 'B' })
    const x = explainReviewBankItem(b, [b, c1, c2], { ...profile, confidenceThreshold: 0.5 })
    expect(x.code).toBe('AMBIGUOUS_CANDIDATES')
  })
})

describe('explainReviewItem', () => {
  it('uses card-specific copy for CARD_CREDIT', () => {
    const t = card({ id: 'c1', amount: 10 })
    const state = { imports: [], transactions: [t], profile }
    const x = explainReviewItem(t, state, profile)
    expect(x.code).toBe('CARD_CREDIT_UNMATCHED')
  })
})

describe('reviewItemDetailLines', () => {
  it('includes source import file and markers', () => {
    const t = bank({
      id: 'b1',
      amount: 1,
      cardToken: '4111111111111111',
      reference: 'REF1',
      date: '2024-05-05',
    })
    const state = {
      imports: [{ id: 'ib', fileName: 'bank.pdf', sourceType: 'DBS_BANK' as const, importedAt: 't', status: 'SUCCESS' as const }],
      transactions: [t],
      profile,
    }
    const d = reviewItemDetailLines(t, state, profile)
    expect(d.sourceFile).toBe('bank.pdf')
    expect(d.markers.some((m) => m.includes('1111'))).toBe(true)
    expect(d.markers.some((m) => m.includes('REF1'))).toBe(true)
  })
})

describe('formatCardTokenHint', () => {
  it('returns last four prefixed for display', () => {
    expect(formatCardTokenHint('4111111111111111')).toBe('····1111')
  })
  it('returns undefined when too short', () => {
    expect(formatCardTokenHint('123')).toBeUndefined()
  })
})
