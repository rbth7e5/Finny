export type SourceType = 'UOB_BANK' | 'UOB_CARD' | 'DBS_BANK' | 'DBS_CARD' | 'UNKNOWN'

export type ReconciliationState =
  | 'AutoMatched'
  | 'NeedsReview'
  | 'UserConfirmed'
  | 'UserOverridden'

export type SpendImpact = 'SPEND' | 'TRANSFER' | 'SETTLEMENT_EXCLUDED' | 'UNRESOLVED_REVIEW'

export type ImportRecord = {
  id: string
  fileName: string
  sourceType: SourceType
  importedAt: string
  status: 'SUCCESS' | 'FAILED'
  warning?: string
  /** SHA-256 (hex) of raw PDF bytes; used to skip duplicate file re-imports. */
  contentHash?: string
}

export type TransactionKind = 'BANK_SETTLEMENT' | 'CARD_CREDIT' | 'TRANSFER'

export type Transaction = {
  id: string
  importId: string
  sourceType: SourceType
  kind: TransactionKind
  amount: number
  date: string
  description: string
  cardToken?: string
  reference?: string
  reconciliationState: ReconciliationState
  spendImpact: SpendImpact
  linkedTransactionId?: string
}

export type RuleProfile = {
  matchWindowDays: number
  confidenceThreshold: number
  /**
   * When true, bank settlements only consider card credits from the same issuer
   * (UOB bank ↔ UOB card, DBS bank ↔ DBS card). When false, amount/date/ref rules may pair across issuers.
   */
  sameIssuerCardMatchingOnly: boolean
}

export type AppState = {
  imports: ImportRecord[]
  transactions: Transaction[]
  profile: RuleProfile
}
