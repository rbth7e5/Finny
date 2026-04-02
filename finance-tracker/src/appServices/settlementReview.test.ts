import { describe, expect, it } from 'vitest'
import { EMPTY_STATE_PROFILE } from '../test/fixtures/statements'
import { confirmSettlementPair, listSettlementCardCandidates } from './settlementReview'

const profile = { ...EMPTY_STATE_PROFILE }

function bank(p: Partial<import('../domain/types').Transaction> & { id: string; amount: number }) {
  return {
    importId: 'ib',
    sourceType: 'DBS_BANK' as const,
    kind: 'BANK_SETTLEMENT' as const,
    date: '2024-01-01',
    description: 'DBSC-4111111111111111',
    reference: 'R1',
    reconciliationState: 'NeedsReview' as const,
    spendImpact: 'UNRESOLVED_REVIEW' as const,
    ...p,
  }
}

function card(p: Partial<import('../domain/types').Transaction> & { id: string; amount: number }) {
  return {
    importId: 'ic',
    sourceType: 'DBS_CARD' as const,
    kind: 'CARD_CREDIT' as const,
    date: '2024-01-02',
    description: 'payment',
    reconciliationState: 'NeedsReview' as const,
    spendImpact: 'UNRESOLVED_REVIEW' as const,
    ...p,
  }
}

describe('listSettlementCardCandidates (TKT-026)', () => {
  it('returns scored card lines that match amount and window', () => {
    const b = bank({ id: 'b1', amount: 100 })
    const c = card({ id: 'c1', amount: 100, reference: 'R1' })
    const rows = listSettlementCardCandidates([b, c], b, profile)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.c.id).toBe('c1')
    expect(rows[0]!.score).toBeGreaterThanOrEqual(0.6)
  })

  it('includes card already linked to this bank (remap / review edge)', () => {
    const b = bank({
      id: 'b1',
      amount: 100,
      linkedTransactionId: 'c1',
    })
    const c = card({
      id: 'c1',
      amount: 100,
      reference: 'R1',
      linkedTransactionId: 'b1',
    })
    const rows = listSettlementCardCandidates([b, c], b, profile)
    expect(rows.some((r) => r.c.id === 'c1')).toBe(true)
  })
})

describe('confirmSettlementPair (TKT-026)', () => {
  it('links bank and card UserConfirmed with SETTLEMENT_EXCLUDED', () => {
    const b = bank({ id: 'b1', amount: 100 })
    const c = card({ id: 'c1', amount: 100, reference: 'R1' })
    const state = { imports: [], transactions: [b, c], profile }
    const r = confirmSettlementPair(state, 'b1', 'c1')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const b2 = r.next.transactions.find((t) => t.id === 'b1')!
    const c2 = r.next.transactions.find((t) => t.id === 'c1')!
    expect(b2.linkedTransactionId).toBe('c1')
    expect(c2.linkedTransactionId).toBe('b1')
    expect(b2.reconciliationState).toBe('UserConfirmed')
    expect(c2.reconciliationState).toBe('UserConfirmed')
    expect(b2.spendImpact).toBe('SETTLEMENT_EXCLUDED')
    expect(c2.spendImpact).toBe('SETTLEMENT_EXCLUDED')
  })

  it('rejects ineligible card id', () => {
    const b = bank({ id: 'b1', amount: 100 })
    const c = card({ id: 'c1', amount: 999 })
    const state = { imports: [], transactions: [b, c], profile }
    const r = confirmSettlementPair(state, 'b1', 'c1')
    expect(r.ok).toBe(false)
  })

  it('remaps from first card to second and restores old card to NeedsReview', () => {
    const b = bank({
      id: 'b1',
      amount: 100,
      reference: 'R1',
      linkedTransactionId: 'c1',
    })
    const c1 = card({
      id: 'c1',
      amount: 100,
      reference: 'R1',
      linkedTransactionId: 'b1',
      reconciliationState: 'AutoMatched',
      spendImpact: 'SETTLEMENT_EXCLUDED',
    })
    const c2 = card({ id: 'c2', amount: 100, reference: 'R1' })
    const state = { imports: [], transactions: [b, c1, c2], profile }
    const r = confirmSettlementPair(state, 'b1', 'c2')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const o1 = r.next.transactions.find((t) => t.id === 'c1')!
    const o2 = r.next.transactions.find((t) => t.id === 'c2')!
    expect(o1.linkedTransactionId).toBeUndefined()
    expect(o1.reconciliationState).toBe('NeedsReview')
    expect(o2.linkedTransactionId).toBe('b1')
    expect(o2.reconciliationState).toBe('UserConfirmed')
  })
})
