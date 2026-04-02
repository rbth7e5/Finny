import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/types'
import { reconcile } from './reconcile'

const profile = { matchWindowDays: 5, confidenceThreshold: 0.75 }

function bank(p: Partial<Transaction> & { id: string; amount: number }): Transaction {
  return {
    importId: 'i1',
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
    importId: 'i2',
    sourceType: 'DBS_CARD',
    kind: 'CARD_CREDIT',
    date: '2024-01-02',
    description: 'payment',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
    ...p,
  }
}

describe('reconcile (PRD §6 settlement / ENG §7.4)', () => {
  it('AutoMatches DBS pair when reference matches and score clears threshold', () => {
    const b = bank({
      id: 'b1',
      amount: 100,
      reference: 'R1',
    })
    const c = card({ id: 'c1', amount: 100, reference: 'R1' })
    const { updated, reviewCount } = reconcile([b, c], profile)
    const b2 = updated.find((t) => t.id === 'b1')!
    const c2 = updated.find((t) => t.id === 'c1')!
    expect(b2.reconciliationState).toBe('AutoMatched')
    expect(c2.reconciliationState).toBe('AutoMatched')
    expect(b2.linkedTransactionId).toBe('c1')
    expect(c2.linkedTransactionId).toBe('b1')
    expect(b2.spendImpact).toBe('SETTLEMENT_EXCLUDED')
    expect(c2.spendImpact).toBe('SETTLEMENT_EXCLUDED')
    expect(reviewCount).toBe(0)
  })

  it('marks NeedsReview when no card candidate matches amount', () => {
    const b = bank({ id: 'b1', amount: 99 })
    const c = card({ id: 'c1', amount: 100 })
    const { updated } = reconcile([b, c], profile)
    expect(updated.find((t) => t.id === 'b1')!.reconciliationState).toBe('NeedsReview')
  })

  it('marks NeedsReview when two candidates are ambiguous (fail-safe)', () => {
    const b = bank({ id: 'b1', amount: 50, reference: 'X' })
    const c1 = card({ id: 'c1', amount: 50, reference: 'A' })
    const c2 = card({ id: 'c2', amount: 50, reference: 'B' })
    const { updated } = reconcile([b, c1, c2], { ...profile, confidenceThreshold: 0.5 })
    expect(updated.find((t) => t.id === 'b1')!.reconciliationState).toBe('NeedsReview')
  })

  it('respects confidenceThreshold for auto match', () => {
    const b = bank({ id: 'b1', amount: 200, reference: undefined })
    const c = card({ id: 'c1', amount: 200, reference: undefined })
    const { updated: high } = reconcile([b, c], { ...profile, confidenceThreshold: 0.75 })
    expect(high.find((t) => t.id === 'b1')!.reconciliationState).toBe('NeedsReview')

    const { updated: low } = reconcile([b, c], { ...profile, confidenceThreshold: 0.55 })
    expect(low.find((t) => t.id === 'b1')!.reconciliationState).toBe('AutoMatched')
  })
})
