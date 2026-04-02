import type { ParsedStatement } from './types'
import { detectSource, parseTransactionsForSource } from './statementParser'

/**
 * Detects statement source and runs the registered parser for that type (TKT-006).
 */
export function runStatementPipeline(text: string, importId: string): ParsedStatement {
  const sourceType = detectSource(text)
  const warnings: string[] = []

  if (sourceType === 'UNKNOWN') {
    warnings.push('Unrecognized statement format')
    return { sourceType, transactions: [], warnings }
  }

  const transactions = parseTransactionsForSource(text, sourceType, importId)
  if (transactions.length === 0) {
    warnings.push('No rows matched known patterns for this statement type')
  }

  return { sourceType, transactions, warnings }
}
