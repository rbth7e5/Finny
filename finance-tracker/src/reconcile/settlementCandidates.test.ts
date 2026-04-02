import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/types'
import {
  bankCardIssuerPairAllowed,
  filterCardPoolForSettlementIssuer,
  matchBankAgainstCards,
} from './settlementCandidates'

const baseProfile = {
  matchWindowDays: 5,
  confidenceThreshold: 0.75,
  sameIssuerCardMatchingOnly: true,
} as const

describe('bankCardIssuerPairAllowed (TKT-016)', () => {
  it('allows UOB and DBS issuer pairs only', () => {
    expect(bankCardIssuerPairAllowed('UOB_BANK', 'UOB_CARD')).toBe(true)
    expect(bankCardIssuerPairAllowed('DBS_BANK', 'DBS_CARD')).toBe(true)
    expect(bankCardIssuerPairAllowed('DBS_BANK', 'UOB_CARD')).toBe(false)
    expect(bankCardIssuerPairAllowed('UOB_BANK', 'DBS_CARD')).toBe(false)
  })
})

describe('filterCardPoolForSettlementIssuer', () => {
  const b: Transaction = {
    id: 'b1',
    importId: 'i',
    sourceType: 'DBS_BANK',
    kind: 'BANK_SETTLEMENT',
    amount: 1,
    date: '2024-01-01',
    description: 'x',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
  }
  const dbsCard: Transaction = {
    ...b,
    id: 'c1',
    sourceType: 'DBS_CARD',
    kind: 'CARD_CREDIT',
  }
  const uobCard: Transaction = {
    ...b,
    id: 'c2',
    sourceType: 'UOB_CARD',
    kind: 'CARD_CREDIT',
  }

  it('excludes cross-issuer cards when sameIssuerCardMatchingOnly', () => {
    const pool = filterCardPoolForSettlementIssuer(b, [dbsCard, uobCard], baseProfile)
    expect(pool.map((c) => c.id)).toEqual(['c1'])
  })

  it('keeps full pool when sameIssuerCardMatchingOnly is false', () => {
    const pool = filterCardPoolForSettlementIssuer(b, [dbsCard, uobCard], {
      ...baseProfile,
      sameIssuerCardMatchingOnly: false,
    })
    expect(pool).toHaveLength(2)
  })
})

describe('matchBankAgainstCards issuer scope', () => {
  const b: Transaction = {
    id: 'b1',
    importId: 'i',
    sourceType: 'DBS_BANK',
    kind: 'BANK_SETTLEMENT',
    amount: 100,
    date: '2024-01-01',
    description: 'x',
    reference: 'R1',
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
  }
  const uob: Transaction = {
    ...b,
    id: 'c1',
    sourceType: 'UOB_CARD',
    kind: 'CARD_CREDIT',
    reference: 'R1',
    date: '2024-01-02',
  }

  it('ignores cross-issuer lines for candidate list when scoped', () => {
    const { candidates } = matchBankAgainstCards(b, [uob], baseProfile)
    expect(candidates).toHaveLength(0)
  })
})
