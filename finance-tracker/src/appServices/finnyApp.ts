import type { AppState, ReconciliationState, SpendImpact } from '../domain/types'
import { buildTransactionFingerprintSet, transactionFingerprint } from '../import/transactionFingerprint'
import { readPdfText } from '../parsers/pdfText'
import { runStatementPipeline } from '../parsers/pipeline'
import { createId } from '../utils/ids'
import { sha256HexOfFile } from '../utils/fileHash'
import { reconcile } from '../reconcile/reconcile'
import type { ImportSessionMeta } from './importDisplay'

export { confirmSettlementPair, listSettlementCardCandidates } from './settlementReview'

export type ImportPdfResult =
  | { ok: true; next: AppState; userMessage: string; session: ImportSessionMeta }
  | { ok: false; userMessage: string }

function hasSuccessfulImportWithHash(imports: AppState['imports'], hash: string): boolean {
  return imports.some((i) => i.contentHash === hash && i.status === 'SUCCESS')
}

/**
 * Orchestrates PDF extraction, source detection, parsing, dedupe, and reconciliation.
 */
export async function importPdfStatements(current: AppState, files: File[]): Promise<ImportPdfResult> {
  try {
    const imports = [...current.imports]
    const txns = [...current.transactions]
    const fpSeen = buildTransactionFingerprintSet(txns)
    const skippedDuplicateFiles: string[] = []
    let skippedDuplicateTxnCount = 0

    for (const file of files) {
      const contentHash = await sha256HexOfFile(file)
      if (hasSuccessfulImportWithHash(imports, contentHash)) {
        skippedDuplicateFiles.push(file.name)
        continue
      }

      const text = await readPdfText(file)
      const importId = createId('imp')
      const { sourceType, transactions: parsed, warnings } = runStatementPipeline(text, importId)

      const status = sourceType === 'UNKNOWN' ? 'FAILED' : 'SUCCESS'
      const warning =
        sourceType === 'UNKNOWN'
          ? 'Unrecognized statement format'
          : warnings.length
            ? warnings.join(' ')
            : undefined

      imports.push({
        id: importId,
        fileName: file.name,
        sourceType,
        importedAt: new Date().toISOString(),
        status,
        warning,
        contentHash,
      })

      if (sourceType === 'UNKNOWN') continue

      for (const t of parsed) {
        const fp = transactionFingerprint(t)
        if (fpSeen.has(fp)) {
          skippedDuplicateTxnCount += 1
          continue
        }
        fpSeen.add(fp)
        txns.push(t)
      }
    }

    const reconciled = reconcile(txns, current.profile)

    const userMessage = `Import complete. ${reconciled.reviewCount} item(s) need review.`

    return {
      ok: true,
      next: { ...current, imports, transactions: reconciled.updated },
      userMessage,
      session: {
        duplicateFileNames: skippedDuplicateFiles,
        skippedDuplicateTxnCount,
      },
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
  const primarySpend: SpendImpact = action === 'confirm' ? 'SETTLEMENT_EXCLUDED' : 'TRANSFER'

  const byId = new Map(state.transactions.map((t) => [t.id, t]))
  const primary = byId.get(itemId)
  if (!primary) return state

  const partnerId = primary.linkedTransactionId
  const partner = partnerId ? byId.get(partnerId) : undefined

  const transactions = state.transactions.map((t) => {
    if (t.id === itemId) {
      const unlink = action === 'override' && Boolean(partner)
      return {
        ...t,
        reconciliationState,
        spendImpact: primarySpend,
        ...(unlink ? { linkedTransactionId: undefined } : {}),
      }
    }
    if (partner && t.id === partner.id) {
      if (action === 'confirm') {
        const rs: ReconciliationState = 'UserConfirmed'
        const si: SpendImpact = 'SETTLEMENT_EXCLUDED'
        return { ...t, reconciliationState: rs, spendImpact: si }
      }
      const partnerSpend: SpendImpact = t.kind === 'CARD_CREDIT' ? 'SPEND' : 'TRANSFER'
      const rs: ReconciliationState = 'UserOverridden'
      return {
        ...t,
        reconciliationState: rs,
        spendImpact: partnerSpend,
        linkedTransactionId: undefined,
      }
    }
    return t
  })

  return { ...state, transactions }
}

export function updateRuleProfile(
  state: AppState,
  patch: Partial<AppState['profile']>,
): AppState {
  return { ...state, profile: { ...state.profile, ...patch } }
}
