import type { ImportRecord } from '../domain/types'

/** User-visible import row outcome (TKT-013). */
export type ImportRowOutcome = 'success' | 'partial' | 'failed'

export type ImportRowDisplay = {
  outcome: ImportRowOutcome
  badgeLabel: string
  /** Short explanation under badge / in table */
  detail?: string
  /** Machine-oriented, aligns with ENGINEERING_REQUIREMENTS §12 error taxonomy where applicable */
  failureCategory?: string
}

/**
 * FAILED rows: coarse category for UI / future telemetry.
 */
export function importFailureCategory(warning?: string): string {
  if (!warning) return 'IMPORT_ERROR'
  if (/unrecognized statement/i.test(warning)) return 'UNRECOGNIZED_STATEMENT_TYPE'
  if (/no rows matched/i.test(warning)) return 'PARTIAL_PARSE'
  return 'IMPORT_ERROR'
}

export function classifyImportRow(record: ImportRecord): ImportRowDisplay {
  if (record.status === 'FAILED') {
    return {
      outcome: 'failed',
      badgeLabel: 'Failed',
      detail: record.warning,
      failureCategory: importFailureCategory(record.warning),
    }
  }

  if (record.warning) {
    return {
      outcome: 'partial',
      badgeLabel: 'Imported (check info)',
      detail: record.warning,
      failureCategory: importFailureCategory(record.warning),
    }
  }

  return {
    outcome: 'success',
    badgeLabel: 'Success',
  }
}

export type ImportSessionMeta = {
  duplicateFileNames: string[]
  skippedDuplicateTxnCount: number
}

export type ImportSessionBanner = {
  tone: 'info' | 'warning'
  lines: string[]
}

export function buildImportSessionBanner(session: ImportSessionMeta | undefined): ImportSessionBanner | null {
  if (!session) return null
  const lines: string[] = []
  if (session.duplicateFileNames.length) {
    lines.push(
      `Skipped ${session.duplicateFileNames.length} duplicate file(s) (already imported successfully): ${session.duplicateFileNames.join(', ')}.`,
    )
  }
  if (session.skippedDuplicateTxnCount > 0) {
    lines.push(
      `Skipped ${session.skippedDuplicateTxnCount} duplicate transaction row(s) already in the ledger (same file may still count as processed).`,
    )
  }
  if (!lines.length) return null
  return { tone: 'info', lines }
}
