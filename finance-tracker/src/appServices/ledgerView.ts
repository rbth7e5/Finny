import type { AppState, SourceType, Transaction } from '../domain/types'
import { reviewItemDetailLines } from '../reconcile/reviewExplain'

/** Sources shown in ledger filters (excludes UNKNOWN). */
export const LEDGER_SOURCE_OPTIONS = ['UOB_BANK', 'DBS_BANK', 'UOB_CARD', 'DBS_CARD'] as const satisfies readonly SourceType[]

export type LedgerSourceFilter = (typeof LEDGER_SOURCE_OPTIONS)[number]

export const LEDGER_SOURCE_LABELS: Record<LedgerSourceFilter, string> = {
  UOB_BANK: 'UOB Bank',
  DBS_BANK: 'DBS Bank',
  UOB_CARD: 'UOB Card',
  DBS_CARD: 'DBS Card',
}

export type LedgerFilterCriteria = {
  /** When `'all'`, no source filter. Otherwise transaction must match one of these. */
  sourceTypes: 'all' | LedgerSourceFilter[]
  needsReviewOnly: boolean
  /** Bank settlement + card credit rows only (excludes e.g. FAST TRANSFER). */
  settlementRowsOnly: boolean
}

export const DEFAULT_LEDGER_FILTERS: LedgerFilterCriteria = {
  sourceTypes: 'all',
  needsReviewOnly: false,
  settlementRowsOnly: false,
}

/** Ledger-only: bank settlement linked via auto or user confirm can be sent back to Review (TKT-027). */
export function ledgerBankSettlementCanReopenForReview(t: Transaction): boolean {
  return (
    t.kind === 'BANK_SETTLEMENT' &&
    Boolean(t.linkedTransactionId) &&
    (t.reconciliationState === 'AutoMatched' || t.reconciliationState === 'UserConfirmed')
  )
}

export function filterLedgerTransactions(
  transactions: Transaction[],
  criteria: LedgerFilterCriteria,
): Transaction[] {
  return transactions.filter((t) => {
    if (criteria.sourceTypes !== 'all' && !criteria.sourceTypes.some((s) => s === t.sourceType)) {
      return false
    }
    if (criteria.needsReviewOnly && t.reconciliationState !== 'NeedsReview') return false
    if (criteria.settlementRowsOnly && t.kind !== 'BANK_SETTLEMENT' && t.kind !== 'CARD_CREDIT') {
      return false
    }
    return true
  })
}

export type LedgerDetailModel = {
  transaction: Transaction
  sourceFile?: string
  importStatus?: string
  importWarning?: string
  linkedPeerSummary?: string
  /** User-facing reconciliation / review copy */
  reasoningLines: string[]
}

function reconciliationSummary(t: Transaction): string[] {
  const lines: string[] = []
  switch (t.reconciliationState) {
    case 'AutoMatched':
      lines.push(
        t.linkedTransactionId
          ? `Automatically matched to another ledger line (${t.linkedTransactionId}). Spend impact: ${t.spendImpact}.`
          : `Marked AutoMatched. Spend impact: ${t.spendImpact}.`,
      )
      break
    case 'UserConfirmed':
      lines.push(`You confirmed this line as a card settlement. Spend impact: ${t.spendImpact}.`)
      break
    case 'UserOverridden':
      lines.push(`You marked this line as not paying the card. Spend impact: ${t.spendImpact}.`)
      break
    case 'NeedsReview':
      lines.push('This line still needs a review decision on the Review tab.')
      break
    default:
      lines.push(`Reconciliation state: ${t.reconciliationState}. Spend impact: ${t.spendImpact}.`)
  }
  return lines
}

export function buildLedgerDetailModel(t: Transaction, state: AppState): LedgerDetailModel {
  const imp = state.imports.find((i) => i.id === t.importId)
  const sourceFile = imp?.fileName
  const importStatus = imp?.status
  const importWarning = imp?.warning

  let linkedPeerSummary: string | undefined
  if (t.linkedTransactionId) {
    const peer = state.transactions.find((x) => x.id === t.linkedTransactionId)
    if (peer) {
      linkedPeerSummary = `Linked to ${peer.kind} ${peer.amount.toFixed(2)} — ${peer.description} (id ${peer.id})`
    } else {
      linkedPeerSummary = `Linked transaction id: ${t.linkedTransactionId} (peer not found in current ledger)`
    }
  }

  const reasoningLines: string[] = []

  if (t.reconciliationState === 'NeedsReview') {
    const { explanation, markers } = reviewItemDetailLines(t, state, state.profile)
    reasoningLines.push(explanation.humanSummary)
    if (explanation.bestScore !== undefined) {
      reasoningLines.push(
        `Best auto score ${explanation.bestScore.toFixed(2)} vs threshold ${state.profile.confidenceThreshold.toFixed(2)}`,
      )
    }
    reasoningLines.push(`Reason code: ${explanation.code} (${explanation.codeLabel})`)
    reasoningLines.push(...markers.map((m) => `• ${m}`))
  } else {
    reasoningLines.push(...reconciliationSummary(t))
  }

  return {
    transaction: t,
    sourceFile,
    importStatus,
    importWarning,
    linkedPeerSummary,
    reasoningLines,
  }
}
