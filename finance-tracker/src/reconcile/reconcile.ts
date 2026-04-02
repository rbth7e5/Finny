import type { RuleProfile, Transaction } from '../domain/types'
import { matchBankAgainstCards, shouldAutoMatchSettlement } from './settlementCandidates'

/** User-resolved rows must not be re-run through auto-match (would reset them to NeedsReview). */
function eligibleForSettlementAutoMatch(t: Transaction): boolean {
  return t.reconciliationState !== 'UserConfirmed' && t.reconciliationState !== 'UserOverridden'
}

export function reconcile(
  transactions: Transaction[],
  profile: RuleProfile,
): { updated: Transaction[]; reviewCount: number } {
  const updated = [...transactions]
  const bank = updated.filter(
    (t) =>
      t.kind === 'BANK_SETTLEMENT' &&
      !t.linkedTransactionId &&
      eligibleForSettlementAutoMatch(t),
  )
  const card = updated.filter(
    (t) =>
      t.kind === 'CARD_CREDIT' &&
      !t.linkedTransactionId &&
      eligibleForSettlementAutoMatch(t),
  )

  for (const b of bank) {
    const { best, ambiguous } = matchBankAgainstCards(b, card, profile)

    if (shouldAutoMatchSettlement(best, ambiguous, profile.confidenceThreshold)) {
      const matched = best!
      b.linkedTransactionId = matched.c.id
      matched.c.linkedTransactionId = b.id
      b.reconciliationState = 'AutoMatched'
      matched.c.reconciliationState = 'AutoMatched'
      b.spendImpact = 'SETTLEMENT_EXCLUDED'
      matched.c.spendImpact = 'SETTLEMENT_EXCLUDED'
    } else {
      b.reconciliationState = 'NeedsReview'
      b.spendImpact = 'UNRESOLVED_REVIEW'
    }
  }

  const reviewCount = updated.filter((t) => t.reconciliationState === 'NeedsReview').length
  return { updated, reviewCount }
}
