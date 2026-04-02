import type { SourceType, Transaction } from '../domain/types'
import { createId } from '../utils/ids'

function moneyFromLine(line: string): number | null {
  const m = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/)
  if (!m) return null
  return Number(m[1].replaceAll(',', ''))
}

function normalizeDate(line: string): string {
  return line.trim()
}

function extractCardToken(line: string): string | undefined {
  const m = line.match(/(\d{12,16}|\d{4}\s\d{4}\s\d{4}\s\d{4})/)
  return m ? m[1].replaceAll(' ', '') : undefined
}

export function detectSource(text: string): SourceType {
  if (text.includes('Credit Card(s) Statement')) return 'UOB_CARD'
  if (text.includes('Statement of Account') && text.includes('One Account')) return 'UOB_BANK'
  if (text.includes('Credit Cards') && text.includes('Statement of Account') && text.includes('DBS'))
    return 'DBS_CARD'
  if (text.includes('Consolidated Statement') && text.includes('DBS Multiplier')) return 'DBS_BANK'
  return 'UNKNOWN'
}

export function parseTransactions(text: string, sourceType: SourceType, importId: string): Transaction[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const out: Transaction[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (sourceType === 'UOB_BANK' && line.includes('Bill Payment')) {
      const next = lines.slice(i, i + 6).join(' ')
      if (!next.includes('mBK-UOB Cards')) continue
      const amount = lines.slice(i, i + 6).map(moneyFromLine).find((v) => v !== null)
      if (!amount) continue
      const cardToken =
        extractCardToken(lines[i + 2] ?? '') ?? extractCardToken(lines.slice(i, i + 6).join(' '))
      out.push({
        id: createId('txn'),
        importId,
        sourceType,
        kind: 'BANK_SETTLEMENT',
        amount,
        date: normalizeDate(lines[i - 1] ?? 'unknown'),
        description: 'UOB bill payment',
        cardToken,
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
      })
    }

    if (sourceType === 'DBS_BANK' && line.includes('Advice Bill Payment')) {
      const block = lines.slice(i, i + 8)
      const marker = block.find((x) => x.includes('DBSC-'))
      const refLine = block.find((x) => x.startsWith('REF:'))
      const amount = block.map(moneyFromLine).find((v) => v !== null)
      if (!marker || !amount) continue
      out.push({
        id: createId('txn'),
        importId,
        sourceType,
        kind: 'BANK_SETTLEMENT',
        amount,
        date: normalizeDate(lines[i - 1] ?? 'unknown'),
        description: marker,
        cardToken: extractCardToken(marker),
        reference: refLine?.replace('REF:', '').trim(),
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
      })
    }

    if (sourceType === 'DBS_BANK' && line.includes('Advice FAST Payment / Receipt')) {
      const amount = lines.slice(i, i + 4).map(moneyFromLine).find((v) => v !== null)
      if (!amount) continue
      out.push({
        id: createId('txn'),
        importId,
        sourceType,
        kind: 'TRANSFER',
        amount,
        date: normalizeDate(lines[i - 1] ?? 'unknown'),
        description: 'DBS FAST transfer',
        reconciliationState: 'AutoMatched',
        spendImpact: 'TRANSFER',
      })
    }

    if (sourceType === 'UOB_CARD' && line.includes('PAYMT THRU E-BANK/HOMEB/CYBERB')) {
      const amount = moneyFromLine(line)
      if (!amount) continue
      const refLine = lines[i + 1]?.includes('Ref No.') ? lines[i + 1] : undefined
      out.push({
        id: createId('txn'),
        importId,
        sourceType,
        kind: 'CARD_CREDIT',
        amount,
        date: normalizeDate(lines[i - 1] ?? 'unknown'),
        description: 'UOB card payment credit',
        reference: refLine?.replace('Ref No. :', '').trim(),
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
      })
    }

    if (sourceType === 'DBS_CARD' && line.includes('BILL PAYMENT - DBS INTERNET/WIRELESS')) {
      const amount = moneyFromLine(lines[i + 2] ?? lines[i + 1] ?? '')
      const refLine = lines.slice(i, i + 4).find((x) => x.includes('REF NO:'))
      if (!amount) continue
      out.push({
        id: createId('txn'),
        importId,
        sourceType,
        kind: 'CARD_CREDIT',
        amount,
        date: normalizeDate(lines[i - 1] ?? 'unknown'),
        description: 'DBS card payment credit',
        reference: refLine?.replace('REF NO:', '').trim(),
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
      })
    }
  }

  return out
}
