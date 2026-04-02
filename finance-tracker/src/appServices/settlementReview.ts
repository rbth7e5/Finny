import type { AppState, Transaction } from '../domain/types'
import { matchBankAgainstCards, type ScoredCard } from '../reconcile/settlementCandidates'

/** Card credits considered for manual settlement pairing (same pool shape as auto-match, plus current partner). */
export function listSettlementCardCandidates(
  transactions: Transaction[],
  bank: Transaction,
  profile: AppState['profile'],
): ScoredCard[] {
  const cardCredits = transactions.filter((t) => t.kind === 'CARD_CREDIT')
  return matchBankAgainstCards(bank, cardCredits, profile).candidates
}

/**
 * Link a bank settlement to a chosen card credit (bidirectional), both UserConfirmed / SETTLEMENT_EXCLUDED.
 * Any previous card partner of this bank is unlinked and returned to NeedsReview if it differs from `cardId`.
 */
export function confirmSettlementPair(
  state: AppState,
  bankId: string,
  cardId: string,
): { ok: true; next: AppState } | { ok: false; reason: string } {
  const byId = new Map(state.transactions.map((t) => [t.id, t]))
  const bank = byId.get(bankId)
  const card = byId.get(cardId)
  if (!bank || bank.kind !== 'BANK_SETTLEMENT') {
    return { ok: false, reason: 'Not a bank settlement row.' }
  }
  if (!card || card.kind !== 'CARD_CREDIT') {
    return { ok: false, reason: 'Not a card payment credit row.' }
  }

  const candidates = listSettlementCardCandidates(state.transactions, bank, state.profile)
  if (!candidates.some((s) => s.c.id === cardId)) {
    return { ok: false, reason: 'That card line is not eligible for this settlement (amount, dates, or issuer scope).' }
  }

  const oldPartnerId = bank.linkedTransactionId

  const transactions = state.transactions.map((t) => {
    if (oldPartnerId && t.id === oldPartnerId && oldPartnerId !== cardId) {
      return {
        ...t,
        linkedTransactionId: undefined,
        reconciliationState: 'NeedsReview' as const,
        spendImpact: 'UNRESOLVED_REVIEW' as const,
      }
    }
    if (t.id === bankId) {
      return {
        ...t,
        linkedTransactionId: cardId,
        reconciliationState: 'UserConfirmed' as const,
        spendImpact: 'SETTLEMENT_EXCLUDED' as const,
      }
    }
    if (t.id === cardId) {
      return {
        ...t,
        linkedTransactionId: bankId,
        reconciliationState: 'UserConfirmed' as const,
        spendImpact: 'SETTLEMENT_EXCLUDED' as const,
      }
    }
    return t
  })

  return { ok: true, next: { ...state, transactions } }
}
