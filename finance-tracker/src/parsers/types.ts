import type { SourceType, Transaction } from '../domain/types'

export type ParsedStatement = {
  sourceType: SourceType
  transactions: Transaction[]
  /** Non-fatal parse notes for the UI (e.g. no rows matched). */
  warnings: string[]
}
