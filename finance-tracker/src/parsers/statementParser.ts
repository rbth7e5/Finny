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

function uobRefFromNearby(lines: string[], i: number): string | undefined {
  for (let j = i + 1; j <= i + 4 && j < lines.length; j += 1) {
    const l = lines[j] ?? ''
    if (l.includes('Ref No')) {
      return l.replace(/.*Ref No\.?\s*:?\s*/i, '').trim()
    }
  }
  return undefined
}

export function detectSource(text: string): SourceType {
  if (text.includes('Credit Card(s) Statement')) return 'UOB_CARD'
  if (
    /UOB/i.test(text) &&
    /credit card/i.test(text) &&
    /statement/i.test(text) &&
    !text.includes('One Account')
  ) {
    return 'UOB_CARD'
  }
  if (text.includes('Statement of Account') && text.includes('One Account')) return 'UOB_BANK'
  if (
    (text.includes('DBS') || text.includes('POSB')) &&
    /credit cards?/i.test(text) &&
    text.includes('Statement of Account')
  ) {
    return 'DBS_CARD'
  }
  if (text.includes('Credit Cards') && text.includes('Statement of Account') && text.includes('DBS'))
    return 'DBS_CARD'
  if (text.includes('Consolidated Statement') && text.includes('DBS Multiplier')) return 'DBS_BANK'
  return 'UNKNOWN'
}

function tryUobCardLine(lines: string[], i: number, importId: string, sourceType: SourceType): Transaction | null {
  const line = lines[i]
  const u = line.toUpperCase()

  let variant: 'ebank' | 'internet' | 'giro' | 'thankyou' | null = null
  if (
    u.includes('PAYMT THRU') &&
    (u.includes('E-BANK') || u.includes('HOMEB') || u.includes('CYBERB'))
  ) {
    variant = 'ebank'
  } else if (u.includes('PAYMENT') && u.includes('RECEIVED') && (u.includes('INTERNET') || u.includes('GIRO'))) {
    variant = 'internet'
  } else if (u.includes('GIRO') && u.includes('PAYMENT')) {
    variant = 'giro'
  } else if (u.includes('THANK YOU') && u.includes('PAYMENT')) {
    variant = 'thankyou'
  }
  if (!variant) return null

  let amount = moneyFromLine(line)
  if (amount === null) {
    amount = lines.slice(i, i + 4).map(moneyFromLine).find((v) => v !== null) ?? null
  }
  if (amount === null) return null

  const description =
    variant === 'ebank'
      ? 'UOB card payment (e-bank/home banking)'
      : variant === 'internet'
        ? 'UOB card payment (internet/giro)'
        : variant === 'giro'
          ? 'UOB card payment (giro)'
          : 'UOB card payment (thank you)'

  return {
    id: createId('txn'),
    importId,
    sourceType,
    kind: 'CARD_CREDIT',
    amount,
    date: normalizeDate(lines[i - 1] ?? 'unknown'),
    description,
    reference: uobRefFromNearby(lines, i),
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
  }
}

function tryDbsCardLine(lines: string[], i: number, importId: string, sourceType: SourceType): Transaction | null {
  const line = lines[i]
  const u = line.toUpperCase()

  const billPay =
    u.includes('BILL PAYMENT') && (u.includes('DBS') || u.includes('INTERNET') || u.includes('WIRELESS'))
  const payThank = u.includes('PAYMENT') && u.includes('THANK YOU')
  const giroCred = u.includes('GIRO') && u.includes('CREDIT')

  if (!billPay && !payThank && !giroCred) return null

  let amount =
    moneyFromLine(lines[i + 2] ?? '') ??
    moneyFromLine(lines[i + 1] ?? '') ??
    moneyFromLine(line)
  if (amount === null) {
    amount = lines.slice(i, i + 5).map(moneyFromLine).find((v) => v !== null) ?? null
  }
  if (amount === null) return null

  const refLine = lines.slice(i, i + 6).find((x) => /REF\s*NO/i.test(x))
  const reference = refLine?.replace(/.*REF\s*NO\.?\s*:?\s*/i, '').trim()

  return {
    id: createId('txn'),
    importId,
    sourceType,
    kind: 'CARD_CREDIT',
    amount,
    date: normalizeDate(lines[i - 1] ?? 'unknown'),
    description: billPay ? 'DBS card bill payment credit' : 'DBS card payment credit',
    reference,
    reconciliationState: 'NeedsReview',
    spendImpact: 'UNRESOLVED_REVIEW',
  }
}

export function parseTransactionsForSource(
  text: string,
  sourceType: SourceType,
  importId: string,
): Transaction[] {
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

    if (sourceType === 'UOB_CARD') {
      const t = tryUobCardLine(lines, i, importId, sourceType)
      if (t) out.push(t)
    }

    if (sourceType === 'DBS_CARD') {
      const t = tryDbsCardLine(lines, i, importId, sourceType)
      if (t) out.push(t)
    }
  }

  return out
}

/** @deprecated Use `parseTransactionsForSource` via `runStatementPipeline`. */
export const parseTransactions = parseTransactionsForSource
