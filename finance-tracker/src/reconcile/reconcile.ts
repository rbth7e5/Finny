import type { RuleProfile, Transaction } from '../domain/types'
import { datesWithinMatchWindow } from '../utils/statementDate'

export function reconcile(
  transactions: Transaction[],
  profile: RuleProfile,
): { updated: Transaction[]; reviewCount: number } {
  const updated = [...transactions]
  const bank = updated.filter((t) => t.kind === 'BANK_SETTLEMENT' && !t.linkedTransactionId)
  const card = updated.filter((t) => t.kind === 'CARD_CREDIT' && !t.linkedTransactionId)

  for (const b of bank) {
    const candidates = card
      .filter(
        (c) =>
          Math.abs(c.amount - b.amount) < 0.01 &&
          !c.linkedTransactionId &&
          datesWithinMatchWindow(b.date, c.date, profile.matchWindowDays),
      )
      .map((c) => {
        let score = 0.6
        if (b.sourceType.startsWith('DBS') && b.reference && c.reference && b.reference === c.reference) {
          score += 0.35
        }
        if (b.cardToken && c.description.includes(b.cardToken.slice(-4))) score += 0.05
        return { c, score }
      })
      .sort((a, z) => z.score - a.score)

    const best = candidates[0]
    const second = candidates[1]
    const ambiguous = best && second && Math.abs(best.score - second.score) < 0.05

    if (best && best.score >= profile.confidenceThreshold && !ambiguous) {
      b.linkedTransactionId = best.c.id
      best.c.linkedTransactionId = b.id
      b.reconciliationState = 'AutoMatched'
      best.c.reconciliationState = 'AutoMatched'
      b.spendImpact = 'SETTLEMENT_EXCLUDED'
      best.c.spendImpact = 'SETTLEMENT_EXCLUDED'
    } else {
      b.reconciliationState = 'NeedsReview'
      b.spendImpact = 'UNRESOLVED_REVIEW'
    }
  }

  const reviewCount = updated.filter((t) => t.reconciliationState === 'NeedsReview').length
  return { updated, reviewCount }
}
