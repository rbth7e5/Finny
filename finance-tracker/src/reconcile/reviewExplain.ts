import type { AppState, RuleProfile, Transaction } from '../domain/types'
import { matchBankAgainstCards } from './settlementCandidates'

/** Aligns with ENGINEERING_REQUIREMENTS.md §12 reconciliation categories where applicable. */
export type ReviewReasonCode =
  | 'NO_COUNTERPART_IN_WINDOW'
  | 'DATE_OUTSIDE_MATCH_WINDOW'
  | 'LOW_CONFIDENCE'
  | 'AMBIGUOUS_CANDIDATES'
  | 'CARD_CREDIT_UNMATCHED'

export type ReviewItemExplanation = {
  code: ReviewReasonCode
  /** Machine-facing label for UI / telemetry */
  codeLabel: string
  bestScore?: number
  humanSummary: string
}

function importFileName(state: AppState, importId: string): string | undefined {
  return state.imports.find((i) => i.id === importId)?.fileName
}

/** Last 4 digits for display; avoids dumping full PAN. */
export function formatCardTokenHint(cardToken?: string): string | undefined {
  if (!cardToken || cardToken.length < 4) return undefined
  return `····${cardToken.slice(-4)}`
}

export function explainReviewBankItem(
  b: Transaction,
  transactions: Transaction[],
  profile: RuleProfile,
): ReviewItemExplanation {
  const cards = transactions.filter((t) => t.kind === 'CARD_CREDIT' && !t.linkedTransactionId)
  const { candidates, best, ambiguous } = matchBankAgainstCards(b, cards, profile)

  if (candidates.length === 0) {
    const sameAmount = cards.filter((c) => Math.abs(c.amount - b.amount) < 0.01)
    if (sameAmount.length > 0) {
      return {
        code: 'DATE_OUTSIDE_MATCH_WINDOW',
        codeLabel: 'Date / window',
        humanSummary:
          'A card payment with the same amount exists, but its date is outside your match window (see Settings).',
      }
    }
    return {
      code: 'NO_COUNTERPART_IN_WINDOW',
      codeLabel: 'No counterpart',
      humanSummary:
        'No unmatched card payment with this amount appears within the match window on your card imports.',
    }
  }

  if (ambiguous) {
    return {
      code: 'AMBIGUOUS_CANDIDATES',
      codeLabel: 'Multiple candidates',
      bestScore: best?.score,
      humanSummary:
        'Two or more card lines look equally likely at this confidence level; Finny needs your judgement.',
    }
  }

  if (best && best.score < profile.confidenceThreshold) {
    return {
      code: 'LOW_CONFIDENCE',
      codeLabel: 'Low confidence',
      bestScore: best.score,
      humanSummary: `Best automatic match scores ${best.score.toFixed(2)}, below your threshold (${profile.confidenceThreshold.toFixed(2)}).`,
    }
  }

  return {
    code: 'LOW_CONFIDENCE',
    codeLabel: 'Needs review',
    bestScore: best?.score,
    humanSummary: 'Could not auto-match with enough confidence; please confirm or override.',
  }
}

export function explainReviewItem(t: Transaction, state: AppState, profile: RuleProfile): ReviewItemExplanation {
  if (t.kind === 'BANK_SETTLEMENT') {
    return explainReviewBankItem(t, state.transactions, profile)
  }
  return {
    code: 'CARD_CREDIT_UNMATCHED',
    codeLabel: 'Card line unmatched',
    humanSummary:
      'This card payment line was not linked to a bank settlement automatically; check your bank statement import.',
  }
}

export function reviewItemDetailLines(
  t: Transaction,
  state: AppState,
  profile: RuleProfile,
): { explanation: ReviewItemExplanation; sourceFile?: string; markers: string[] } {
  const explanation = explainReviewItem(t, state, profile)
  const sourceFile = importFileName(state, t.importId)
  const markers: string[] = []
  const hint = formatCardTokenHint(t.cardToken)
  if (hint) markers.push(`Card ${hint}`)
  if (t.reference) markers.push(`Ref ${t.reference}`)
  if (t.date) markers.push(`Date ${t.date}`)
  markers.push(`Spend (until resolved): ${t.spendImpact}`)
  return { explanation, sourceFile, markers }
}
