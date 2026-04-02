import type { AppState, SourceType } from '../domain/types'

const REQUIRED_SOURCES: SourceType[] = ['UOB_BANK', 'DBS_BANK', 'UOB_CARD', 'DBS_CARD']

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
