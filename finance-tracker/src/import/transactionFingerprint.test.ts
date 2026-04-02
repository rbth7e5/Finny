import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/types'
import { buildTransactionFingerprintSet, transactionFingerprint } from './transactionFingerprint'

function txn(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'kind' | 'amount'>): Transaction {
  return {
    importId: 'imp-1',
    sourceType: 'UOB_BANK',
    date: '2024-01-01',
    description: 'Test',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
    ...partial,
  }
}

describe('transactionFingerprint (PRD duplicate protection)', () => {
  it('same logical row produces same fingerprint', () => {
    const a = txn({
      id: 'a',
      kind: 'BANK_SETTLEMENT',
      amount: 100.005,
      description: 'Hello   World',
      reference: 'REF1',
    })
    const b = txn({
      id: 'b',
      kind: 'BANK_SETTLEMENT',
      amount: 100.01,
      description: 'hello world',
      reference: 'ref1',
    })
    expect(transactionFingerprint(a)).toBe(transactionFingerprint(b))
  })

  it('different amount changes fingerprint', () => {
    const a = txn({ id: 'a', kind: 'CARD_CREDIT', amount: 10 })
    const b = txn({ id: 'b', kind: 'CARD_CREDIT', amount: 11 })
    expect(transactionFingerprint(a)).not.toBe(transactionFingerprint(b))
  })

  it('buildTransactionFingerprintSet supports dedupe checks', () => {
    const t = txn({ id: 'x', kind: 'TRANSFER', amount: 5, description: 'x' })
    const set = buildTransactionFingerprintSet([t])
    expect(set.has(transactionFingerprint(t))).toBe(true)
  })
})
