import type { Transaction } from '../domain/types'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Stable key for deduping the same logical row across re-imports or duplicate files. */
export function transactionFingerprint(t: Transaction): string {
  const desc = t.description.toLowerCase().replace(/\s+/g, ' ').trim()
  return [
    t.kind,
    t.sourceType,
    String(roundMoney(t.amount)),
    t.date.trim(),
    desc,
    (t.reference ?? '').trim().toLowerCase(),
    (t.cardToken ?? '').trim(),
  ].join('\x1e')
}

export function buildTransactionFingerprintSet(transactions: Transaction[]): Set<string> {
  return new Set(transactions.map(transactionFingerprint))
}
