import { describe, expect, it } from 'vitest'
import type { AppState, Transaction } from '../domain/types'
import {
  buildLedgerDetailModel,
  DEFAULT_LEDGER_FILTERS,
  filterLedgerTransactions,
  LEDGER_SOURCE_OPTIONS,
  type LedgerSourceFilter,
} from './ledgerView'

const profile = { matchWindowDays: 5, confidenceThreshold: 0.75, sameIssuerCardMatchingOnly: true }

function txn(p: Partial<Transaction> & Pick<Transaction, 'id' | 'kind' | 'amount'>): Transaction {
  return {
    importId: 'imp1',
    sourceType: 'UOB_BANK',
    date: '2024-01-01',
    description: 'x',
    reconciliationState: 'AutoMatched',
    spendImpact: 'SETTLEMENT_EXCLUDED',
    ...p,
  }
}

describe('filterLedgerTransactions (TKT-015)', () => {
  const rows = [
    txn({ id: 'a', kind: 'BANK_SETTLEMENT', amount: 1, sourceType: 'UOB_BANK' }),
    txn({
      id: 'b',
      kind: 'TRANSFER',
      amount: 2,
      sourceType: 'DBS_BANK',
      reconciliationState: 'AutoMatched',
      spendImpact: 'TRANSFER',
    }),
    txn({
      id: 'c',
      kind: 'CARD_CREDIT',
      amount: 3,
      sourceType: 'DBS_CARD',
      reconciliationState: 'NeedsReview',
      spendImpact: 'UNRESOLVED_REVIEW',
    }),
  ]

  it('returns all when defaults (all sources, no toggles)', () => {
    expect(filterLedgerTransactions(rows, DEFAULT_LEDGER_FILTERS)).toEqual(rows)
  })

  it('filters by source type subset', () => {
    const f = filterLedgerTransactions(rows, {
      ...DEFAULT_LEDGER_FILTERS,
      sourceTypes: ['UOB_BANK', 'DBS_CARD'] as LedgerSourceFilter[],
    })
    expect(f.map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('needsReviewOnly keeps only NeedsReview', () => {
    const f = filterLedgerTransactions(rows, {
      ...DEFAULT_LEDGER_FILTERS,
      needsReviewOnly: true,
    })
    expect(f).toHaveLength(1)
    expect(f[0]!.id).toBe('c')
  })

  it('settlementRowsOnly excludes TRANSFER', () => {
    const f = filterLedgerTransactions(rows, {
      ...DEFAULT_LEDGER_FILTERS,
      settlementRowsOnly: true,
    })
    expect(f.map((t) => t.id)).toEqual(['a', 'c'])
  })
})

describe('LEDGER_SOURCE_OPTIONS', () => {
  it('lists four statement sources for filters', () => {
    expect(LEDGER_SOURCE_OPTIONS).toEqual(['UOB_BANK', 'DBS_BANK', 'UOB_CARD', 'DBS_CARD'])
  })
})

describe('buildLedgerDetailModel', () => {
  const baseState: AppState = {
    imports: [
      {
        id: 'imp1',
        fileName: 'stmt.pdf',
        sourceType: 'UOB_BANK',
        importedAt: 't',
        status: 'SUCCESS',
      },
    ],
    transactions: [],
    profile,
  }

  it('includes import file and status', () => {
    const t = txn({ id: 'x', kind: 'BANK_SETTLEMENT', amount: 10 })
    const m = buildLedgerDetailModel(t, baseState)
    expect(m.sourceFile).toBe('stmt.pdf')
    expect(m.importStatus).toBe('SUCCESS')
  })

  it('links peer summary when linkedTransactionId set', () => {
    const t = txn({
      id: 'x',
      kind: 'BANK_SETTLEMENT',
      amount: 10,
      linkedTransactionId: 'card1',
      description: 'Bill pay',
    })
    const peer = txn({
      id: 'card1',
      kind: 'CARD_CREDIT',
      amount: 10,
      description: 'Payment thanks',
      linkedTransactionId: 'x',
    })
    const state: AppState = { ...baseState, transactions: [t, peer] }
    const m = buildLedgerDetailModel(t, state)
    expect(m.linkedPeerSummary).toContain('card1')
    expect(m.linkedPeerSummary).toContain('Payment thanks')
  })

  it('adds review explanation lines for NeedsReview bank row', () => {
    const t = txn({
      id: 'b1',
      kind: 'BANK_SETTLEMENT',
      amount: 99,
      reconciliationState: 'NeedsReview',
      spendImpact: 'UNRESOLVED_REVIEW',
    })
    const card = txn({
      id: 'c1',
      kind: 'CARD_CREDIT',
      amount: 100,
      reconciliationState: 'NeedsReview',
      spendImpact: 'UNRESOLVED_REVIEW',
    })
    const state: AppState = { ...baseState, transactions: [t, card] }
    const m = buildLedgerDetailModel(t, state)
    expect(m.reasoningLines.some((l) => l.includes('counterpart') || l.includes('No unmatched'))).toBe(true)
  })
})
