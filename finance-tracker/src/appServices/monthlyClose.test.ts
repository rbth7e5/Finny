import { describe, expect, it } from 'vitest'
import type { AppState } from '../domain/types'
import { getMonthlyCloseSummary, getReviewQueue } from './monthlyClose'

const base: AppState = {
  imports: [],
  transactions: [],
  profile: { matchWindowDays: 5, confidenceThreshold: 0.75 },
}

describe('getMonthlyCloseSummary (PRD Scenario A — four statement types)', () => {
  it('counts all four sources missing when empty', () => {
    const s = getMonthlyCloseSummary(base)
    expect(s.missingCount).toBe(4)
    expect(s.requiredSources).toEqual(['UOB_BANK', 'DBS_BANK', 'UOB_CARD', 'DBS_CARD'])
  })

  it('reduces missingCount as SUCCESS imports cover sources', () => {
    const state: AppState = {
      ...base,
      imports: [
        {
          id: '1',
          fileName: 'uob-b.pdf',
          sourceType: 'UOB_BANK',
          importedAt: 't',
          status: 'SUCCESS',
        },
        {
          id: '2',
          fileName: 'dbs-c.pdf',
          sourceType: 'DBS_CARD',
          importedAt: 't',
          status: 'SUCCESS',
        },
      ],
    }
    const s = getMonthlyCloseSummary(state)
    expect(s.presentSources.has('UOB_BANK')).toBe(true)
    expect(s.presentSources.has('DBS_CARD')).toBe(true)
    expect(s.missingCount).toBe(2)
  })

  it('ignores FAILED imports for presence', () => {
    const state: AppState = {
      ...base,
      imports: [
        {
          id: '1',
          fileName: 'x.pdf',
          sourceType: 'UOB_BANK',
          importedAt: 't',
          status: 'FAILED',
        },
      ],
    }
    expect(getMonthlyCloseSummary(state).missingCount).toBe(4)
  })
})

describe('getReviewQueue', () => {
  it('returns only NeedsReview transactions', () => {
    const state: AppState = {
      ...base,
      transactions: [
        {
          id: 'a',
          importId: 'i',
          sourceType: 'UOB_BANK',
          kind: 'BANK_SETTLEMENT',
          amount: 1,
          date: 'd',
          description: 'x',
          reconciliationState: 'NeedsReview',
          spendImpact: 'UNRESOLVED_REVIEW',
        },
        {
          id: 'b',
          importId: 'i',
          sourceType: 'UOB_BANK',
          kind: 'BANK_SETTLEMENT',
          amount: 2,
          date: 'd',
          description: 'y',
          reconciliationState: 'AutoMatched',
          spendImpact: 'SETTLEMENT_EXCLUDED',
        },
      ],
    }
    expect(getReviewQueue(state)).toHaveLength(1)
    expect(getReviewQueue(state)[0]!.id).toBe('a')
  })
})
