import type { RuleProfile, Transaction } from '../domain/types'
import { datesWithinMatchWindow } from '../utils/statementDate'

/** Same gap as reconcile: top-two scores within this are treated as ambiguous. */
export const SCORE_AMBIGUITY_GAP = 0.05

export type ScoredCard = { c: Transaction; score: number }

/**
 * Score unmatched card credits against a bank settlement line (v1 matching rules).
 */
export function matchBankAgainstCards(
  b: Transaction,
  cardPool: Transaction[],
  profile: RuleProfile,
): { candidates: ScoredCard[]; best?: ScoredCard; second?: ScoredCard; ambiguous: boolean } {
  const candidates = cardPool
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
  const ambiguous = Boolean(
    best && second && Math.abs(best.score - second.score) < SCORE_AMBIGUITY_GAP,
  )

  return { candidates, best, second, ambiguous }
}

export function shouldAutoMatchSettlement(
  best: ScoredCard | undefined,
  ambiguous: boolean,
  confidenceThreshold: number,
): boolean {
  return Boolean(best && best.score >= confidenceThreshold && !ambiguous)
}
