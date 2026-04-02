import type { AppState, SourceType } from '../domain/types'

const REQUIRED_SOURCES: SourceType[] = ['UOB_BANK', 'DBS_BANK', 'UOB_CARD', 'DBS_CARD']

/** Engineering contract: deterministic order — missing imports, then review, then summary (ER §11). */
export type MonthlyNextAction = 'IMPORT_MISSING' | 'RESOLVE_REVIEW' | 'VIEW_SUMMARY'

/** Latest `YYYY-MM` from successful imports, or `unscoped` when none. */
export function inferMonthKey(state: AppState): string {
  const ok = state.imports.filter((i) => i.status === 'SUCCESS')
  if (ok.length === 0) return 'unscoped'
  let best = ok[0]!
  for (const i of ok) {
    if (i.importedAt > best.importedAt) best = i
  }
  return best.importedAt.slice(0, 7)
}

export function getMonthlyStatus(state: AppState) {
  const summary = getMonthlyCloseSummary(state)
  const monthKey = inferMonthKey(state)
  if (summary.missingCount > 0) {
    return {
      monthKey,
      nextAction: 'IMPORT_MISSING' as const,
      reasonText: `${summary.missingCount} required statement(s) missing`,
    }
  }
  if (summary.reviewCount > 0) {
    return {
      monthKey,
      nextAction: 'RESOLVE_REVIEW' as const,
      reasonText: `${summary.reviewCount} item(s) need review`,
    }
  }
  return {
    monthKey,
    nextAction: 'VIEW_SUMMARY' as const,
    reasonText: 'Month complete — view summary',
  }
}

export function getMonthlyCloseSummary(state: AppState) {
  const presentSources = new Set(
    state.imports.filter((i) => i.status === 'SUCCESS').map((i) => i.sourceType),
  )
  const missingCount = REQUIRED_SOURCES.filter((x) => !presentSources.has(x)).length
  const reviewCount = state.transactions.filter((t) => t.reconciliationState === 'NeedsReview').length
  return {
    requiredSources: REQUIRED_SOURCES,
    presentSources,
    missingCount,
    reviewCount,
  }
}

export function getReviewQueue(state: AppState) {
  return state.transactions.filter((t) => t.reconciliationState === 'NeedsReview')
}
