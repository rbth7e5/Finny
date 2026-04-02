import { describe, expect, it } from 'vitest'
import type { AppState } from '../domain/types'
import {
  getMonthlyCloseSummary,
  getMonthlyStatus,
  getReviewQueue,
  inferMonthKey,
} from './monthlyClose'

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

describe('inferMonthKey', () => {
  it('returns unscoped when no successful imports', () => {
    expect(inferMonthKey(base)).toBe('unscoped')
  })

  it('returns YYYY-MM from the latest SUCCESS import by importedAt', () => {
    const state: AppState = {
      ...base,
      imports: [
        {
          id: 'a',
          fileName: 'old.pdf',
          sourceType: 'UOB_BANK',
          importedAt: '2024-01-05T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: 'b',
          fileName: 'new.pdf',
          sourceType: 'DBS_BANK',
          importedAt: '2024-03-01T12:00:00.000Z',
          status: 'SUCCESS',
        },
      ],
    }
    expect(inferMonthKey(state)).toBe('2024-03')
  })
})

describe('getMonthlyStatus (ER §11 — next_action + reason_text + month_key)', () => {
  it('IMPORT_MISSING when required sources absent', () => {
    const s = getMonthlyStatus(base)
    expect(s.nextAction).toBe('IMPORT_MISSING')
    expect(s.reasonText).toBe('4 required statement(s) missing')
    expect(s.monthKey).toBe('unscoped')
  })

  it('RESOLVE_REVIEW when imports complete but NeedsReview remains', () => {
    const state: AppState = {
      ...base,
      imports: [
        {
          id: '1',
          fileName: 'u.pdf',
          sourceType: 'UOB_BANK',
          importedAt: '2025-06-01T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '2',
          fileName: 'd1.pdf',
          sourceType: 'DBS_BANK',
          importedAt: '2025-06-02T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '3',
          fileName: 'uc.pdf',
          sourceType: 'UOB_CARD',
          importedAt: '2025-06-03T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '4',
          fileName: 'dc.pdf',
          sourceType: 'DBS_CARD',
          importedAt: '2025-06-04T00:00:00.000Z',
          status: 'SUCCESS',
        },
      ],
      transactions: [
        {
          id: 't',
          importId: '1',
          sourceType: 'UOB_BANK',
          kind: 'BANK_SETTLEMENT',
          amount: 1,
          date: 'd',
          description: 'x',
          reconciliationState: 'NeedsReview',
          spendImpact: 'UNRESOLVED_REVIEW',
        },
      ],
    }
    const s = getMonthlyStatus(state)
    expect(s.nextAction).toBe('RESOLVE_REVIEW')
    expect(s.reasonText).toBe('1 item(s) need review')
    expect(s.monthKey).toBe('2025-06')
  })

  it('VIEW_SUMMARY when nothing missing and no review queue', () => {
    const state: AppState = {
      ...base,
      imports: [
        {
          id: '1',
          fileName: 'u.pdf',
          sourceType: 'UOB_BANK',
          importedAt: '2025-07-10T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '2',
          fileName: 'd1.pdf',
          sourceType: 'DBS_BANK',
          importedAt: '2025-07-11T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '3',
          fileName: 'uc.pdf',
          sourceType: 'UOB_CARD',
          importedAt: '2025-07-12T00:00:00.000Z',
          status: 'SUCCESS',
        },
        {
          id: '4',
          fileName: 'dc.pdf',
          sourceType: 'DBS_CARD',
          importedAt: '2025-07-13T00:00:00.000Z',
          status: 'SUCCESS',
        },
      ],
    }
    const s = getMonthlyStatus(state)
    expect(s.nextAction).toBe('VIEW_SUMMARY')
    expect(s.reasonText).toBe('Month complete — view summary')
    expect(s.monthKey).toBe('2025-07')
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
