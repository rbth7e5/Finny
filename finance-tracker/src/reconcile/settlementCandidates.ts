import type { RuleProfile, SourceType, Transaction } from '../domain/types'
import { datesWithinMatchWindow } from '../utils/statementDate'

/** Same gap as reconcile: top-two scores within this are treated as ambiguous. */
export const SCORE_AMBIGUITY_GAP = 0.05

export type ScoredCard = { c: Transaction; score: number }

export function bankCardIssuerPairAllowed(bank: SourceType, card: SourceType): boolean {
  if (bank === 'UOB_BANK' && card === 'UOB_CARD') return true
  if (bank === 'DBS_BANK' && card === 'DBS_CARD') return true
  return false
}

/** Restricts the card pool used for settlement auto-matching when `sameIssuerCardMatchingOnly` is on. */
export function filterCardPoolForSettlementIssuer(
  bank: Transaction,
  cardPool: Transaction[],
  profile: RuleProfile,
): Transaction[] {
  if (!profile.sameIssuerCardMatchingOnly) return cardPool
  return cardPool.filter((c) => bankCardIssuerPairAllowed(bank.sourceType, c.sourceType))
}

/**
 * Score unmatched card credits against a bank settlement line (v1 matching rules).
 */
export function matchBankAgainstCards(
  b: Transaction,
  cardPool: Transaction[],
  profile: RuleProfile,
): { candidates: ScoredCard[]; best?: ScoredCard; second?: ScoredCard; ambiguous: boolean } {
  const pool = filterCardPoolForSettlementIssuer(b, cardPool, profile)
  const candidates = pool
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
