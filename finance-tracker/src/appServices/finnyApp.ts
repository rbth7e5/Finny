import type { AppState, ReconciliationState, SpendImpact } from '../domain/types'
import { readPdfText } from '../parsers/pdfText'
import { detectSource, parseTransactions } from '../parsers/statementParser'
import { createId } from '../utils/ids'
import { reconcile } from '../reconcile/reconcile'

export type ImportPdfResult =
  | { ok: true; next: AppState; userMessage: string }
  | { ok: false; userMessage: string }

/**
 * Orchestrates PDF extraction, source detection, parsing, and reconciliation.
 * UI should call this instead of touching parsers/reconcile directly.
 */
export async function importPdfStatements(current: AppState, files: File[]): Promise<ImportPdfResult> {
  try {
    const imports = [...current.imports]
    const txns = [...current.transactions]
    for (const file of files) {
      const text = await readPdfText(file)
      const sourceType = detectSource(text)
      const importId = createId('imp')
      imports.push({
        id: importId,
        fileName: file.name,
        sourceType,
        importedAt: new Date().toISOString(),
        status: sourceType === 'UNKNOWN' ? 'FAILED' : 'SUCCESS',
        warning: sourceType === 'UNKNOWN' ? 'Unrecognized statement format' : undefined,
      })
      if (sourceType !== 'UNKNOWN') {
        txns.push(...parseTransactions(text, sourceType, importId))
      }
    }
    const reconciled = reconcile(txns, current.profile)
    return {
      ok: true,
      next: { ...current, imports, transactions: reconciled.updated },
      userMessage: `Import complete. ${reconciled.reviewCount} item(s) need review.`,
    }
  } catch (err) {
    return { ok: false, userMessage: `Import failed: ${String(err)}` }
  }
}

export function resolveReviewItem(
  state: AppState,
  itemId: string,
  action: 'confirm' | 'override',
): AppState {
  const reconciliationState: ReconciliationState =
    action === 'confirm' ? 'UserConfirmed' : 'UserOverridden'
  const spendImpact: SpendImpact = action === 'confirm' ? 'SETTLEMENT_EXCLUDED' : 'TRANSFER'
  const transactions = state.transactions.map((t) => {
    if (t.id !== itemId) return t
    return { ...t, reconciliationState, spendImpact }
  })
  return { ...state, transactions }
}

export function updateRuleProfile(
  state: AppState,
  patch: Partial<AppState['profile']>,
): AppState {
  return { ...state, profile: { ...state.profile, ...patch } }
}
