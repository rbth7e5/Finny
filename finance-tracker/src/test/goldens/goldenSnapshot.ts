import type { AppState } from '../../domain/types'

/**
 * TKT-020 — Stable, diff-friendly shape for golden comparisons (no timestamps or content hashes).
 */
export type GoldenSnapshot = {
  imports: Array<{
    id: string
    fileName: string
    sourceType: string
    status: string
    warning?: string
  }>
  transactions: Array<{
    id: string
    importId: string
    sourceType: string
    kind: string
    amount: number
    date: string
    description: string
    cardToken?: string
    reference?: string
    reconciliationState: string
    spendImpact: string
    linkedTransactionId?: string
  }>
  reviewCount: number
  spendImpactCounts: Record<string, number>
  linkedSettlementPairs: number
}

function sortedById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id))
}

export function buildGoldenSnapshot(state: AppState, reviewCount: number): GoldenSnapshot {
  const imports = sortedById(state.imports).map((i) => ({
    id: i.id,
    fileName: i.fileName,
    sourceType: i.sourceType,
    status: i.status,
    ...(i.warning ? { warning: i.warning } : {}),
  }))

  const transactions = sortedById(state.transactions).map((t) => ({
    id: t.id,
    importId: t.importId,
    sourceType: t.sourceType,
    kind: t.kind,
    amount: t.amount,
    date: t.date,
    description: t.description,
    ...(t.cardToken !== undefined ? { cardToken: t.cardToken } : {}),
    ...(t.reference !== undefined ? { reference: t.reference } : {}),
    reconciliationState: t.reconciliationState,
    spendImpact: t.spendImpact,
    ...(t.linkedTransactionId !== undefined ? { linkedTransactionId: t.linkedTransactionId } : {}),
  }))

  const spendImpactCounts: Record<string, number> = {}
  for (const t of state.transactions) {
    spendImpactCounts[t.spendImpact] = (spendImpactCounts[t.spendImpact] ?? 0) + 1
  }

  let linkedSettlementPairs = 0
  const seen = new Set<string>()
  for (const t of state.transactions) {
    if (t.kind !== 'BANK_SETTLEMENT' || !t.linkedTransactionId) continue
    const pairKey = [t.id, t.linkedTransactionId].sort().join('|')
    if (seen.has(pairKey)) continue
    seen.add(pairKey)
    linkedSettlementPairs += 1
  }

  return {
    imports,
    transactions,
    reviewCount,
    spendImpactCounts,
    linkedSettlementPairs,
  }
}
