import type { SourceType, Transaction } from '../domain/types'
import { createId } from '../utils/ids'
import {
  inferStatementYearFromText,
  parseDdMmmWithYear,
  parseStatementDate,
  toIsoDateString,
} from '../utils/statementDate'

function moneyFromLine(line: string): number | null {
  const m = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/)
  if (!m) return null
  return Number(m[1].replaceAll(',', ''))
}

function normalizeDate(line: string): string {
  const t = line.trim()
  const d = parseStatementDate(t)
  return d ? toIsoDateString(d) : t
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

function looksLikeDdMmm(line: string): boolean {
  return /^\d{1,2}\s+[A-Za-z]{3,9}$/i.test(line.trim())
}

function shouldSkipUobGridDesc(desc: string): boolean {
  const u = desc.toUpperCase().trim()
  if (u.length < 3) return true
  if (
    u.includes('PREVIOUS BALANCE') ||
    u.includes('SUB TOTAL') ||
    u.includes('SUBTOTAL') ||
    u.includes('TOTAL BALANCE') ||
    u.includes('TOTAL FOR') ||
    u.includes('MINIMUM PAYMENT') ||
    u.includes('NEW BALANCE') ||
    u.includes('PAYMENT DUE')
  ) {
    return true
  }
  if (/^POST(\s+DATE)?$/i.test(desc.trim()) || /^TRANS(\s+DATE)?$/i.test(desc.trim())) return true
  if (/^PAGE\s+\d/i.test(desc.trim())) return true
  return false
}

function classifyUobGridCreditDesc(desc: string): 'ebank' | 'internet' | 'giro' | 'thankyou' | null {
  const u = desc.toUpperCase()
  if (
    u.includes('PAYMT THRU') &&
    (u.includes('E-BANK') || u.includes('HOMEB') || u.includes('CYBERB'))
  ) {
    return 'ebank'
  }
  if (u.includes('PAYMENT') && u.includes('RECEIVED') && (u.includes('INTERNET') || u.includes('GIRO'))) {
    return 'internet'
  }
  if (u.includes('GIRO') && u.includes('PAYMENT')) return 'giro'
  if (u.includes('THANK YOU') && u.includes('PAYMENT')) return 'thankyou'
  return null
}

function gridCreditDescription(variant: 'ebank' | 'internet' | 'giro' | 'thankyou'): string {
  switch (variant) {
    case 'ebank':
      return 'UOB card payment (e-bank/home banking)'
    case 'internet':
      return 'UOB card payment (internet/giro)'
    case 'giro':
      return 'UOB card payment (giro)'
    default:
      return 'UOB card payment (thank you)'
  }
}

type GridRowResult = { txn: Transaction; consumed: number }

function tryConsumeUobCardGridRow(
  lines: string[],
  i: number,
  importId: string,
  year: number,
): GridRowResult | null {
  if (!looksLikeDdMmm(lines[i] ?? '') || !looksLikeDdMmm(lines[i + 1] ?? '')) return null
  const desc = (lines[i + 2] ?? '').trim()
  if (!desc || shouldSkipUobGridDesc(desc)) return null

  const transDateLine = lines[i + 1] ?? ''
  const isoDate = (() => {
    const d = parseDdMmmWithYear(transDateLine, year) ?? parseDdMmmWithYear(lines[i] ?? '', year)
    return d ? toIsoDateString(d) : null
  })()
  if (!isoDate) return null

  const creditVariant = classifyUobGridCreditDesc(desc)
  if (creditVariant) {
    let best: { amount: number; j: number } | null = null
    const limit = Math.min(lines.length, i + 10)
    for (let j = i + 3; j < limit; j += 1) {
      const l = lines[j] ?? ''
      const ml = moneyFromLine(l)
      if (ml === null) continue
      if (l.toUpperCase().includes('CR')) {
        best = { amount: ml, j }
        break
      }
      if (!best) best = { amount: ml, j }
    }
    if (!best) return null
    let reference: string | undefined
    for (let j = i + 3; j < best.j; j += 1) {
      const l = lines[j] ?? ''
      if (l.includes('Ref No')) {
        reference = l.replace(/.*Ref No\.?\s*:?\s*/i, '').trim()
        break
      }
    }
    return {
      txn: {
        id: createId('txn'),
        importId,
        sourceType: 'UOB_CARD',
        kind: 'CARD_CREDIT',
        amount: best.amount,
        date: isoDate,
        description: gridCreditDescription(creditVariant),
        reference,
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
      },
      consumed: best.j - i + 1,
    }
  }

  let j = i + 3
  let reference: string | undefined
  const refLine = lines[j] ?? ''
  if (/ref\s*no/i.test(refLine)) {
    reference = refLine.replace(/.*Ref No\.?\s*:?\s*/i, '').trim()
    j += 1
  }
  while (j < lines.length) {
    const t = (lines[j] ?? '').trim()
    if (/^[A-Z]{3}\s+[\d,]*\d+\.\d{2}\s*$/i.test(t)) {
      j += 1
      continue
    }
    break
  }
  const amtLine = (lines[j] ?? '').trim()
  if (!amtLine || /CR/i.test(amtLine)) return null
  if (!/^\d{1,3}(?:,\d{3})*\.\d{2}\s*$/.test(amtLine)) return null
  const amount = moneyFromLine(amtLine)
  if (amount === null) return null
  return {
    txn: {
      id: createId('txn'),
      importId,
      sourceType: 'UOB_CARD',
      kind: 'CARD_PURCHASE',
      amount,
      date: isoDate,
      description: desc,
      reference,
      reconciliationState: 'AutoMatched',
      spendImpact: 'SPEND',
    },
    consumed: j - i + 1,
  }
}

function extractAllUobCardTransactions(lines: string[], importId: string, fullText: string): Transaction[] {
  const year = inferStatementYearFromText(fullText) ?? new Date().getUTCFullYear()
  const consumed = new Set<number>()
  const out: Transaction[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const row = tryConsumeUobCardGridRow(lines, i, importId, year)
    if (!row) continue
    for (let k = i; k < i + row.consumed; k += 1) consumed.add(k)
    out.push(row.txn)
    i += row.consumed - 1
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (consumed.has(i)) continue
    const credit = tryUobCardLine(lines, i, importId, 'UOB_CARD')
    if (credit) {
      out.push(credit)
      continue
    }
    const purchase = tryUobCardPurchaseLine(lines, i, importId, 'UOB_CARD')
    if (purchase) out.push(purchase)
  }

  return out
}

/** Retail purchase: previous line is a parseable date; current line is merchant + trailing amount (TKT-028). */
function tryUobCardPurchaseLine(
  lines: string[],
  i: number,
  importId: string,
  sourceType: SourceType,
): Transaction | null {
  if (sourceType !== 'UOB_CARD') return null
  const line = lines[i] ?? ''
  const u = line.toUpperCase()
  if (
    u.includes('PAYMT') ||
    u.includes('THANK YOU') ||
    u.includes('PAYMENT RECEIVED') ||
    u.includes('BILL PAYMENT') ||
    u.includes('E-BANK') ||
    u.includes('HOMEB') ||
    u.includes('CYBERB')
  ) {
    return null
  }
  const prev = (lines[i - 1] ?? '').trim()
  if (!parseStatementDate(prev)) return null
  const m = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/)
  if (!m) return null
  const amount = Number(m[1]!.replaceAll(',', ''))
  const desc = line.slice(0, m.index).trim()
  if (desc.length < 3) return null
  return {
    id: createId('txn'),
    importId,
    sourceType,
    kind: 'CARD_PURCHASE',
    amount,
    date: normalizeDate(prev),
    description: desc,
    reconciliationState: 'AutoMatched',
    spendImpact: 'SPEND',
  }
}

function tryDbsCardPurchaseLine(
  lines: string[],
  i: number,
  importId: string,
  sourceType: SourceType,
): Transaction | null {
  if (sourceType !== 'DBS_CARD') return null
  const line = lines[i] ?? ''
  const u = line.toUpperCase()
  if (u.includes('BILL PAYMENT') || u.includes('THANK YOU') || (u.includes('GIRO') && u.includes('CREDIT'))) {
    return null
  }
  const prev = (lines[i - 1] ?? '').trim()
  if (!parseStatementDate(prev)) return null
  const m = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/)
  if (!m) return null
  const amount = Number(m[1]!.replaceAll(',', ''))
  const desc = line.slice(0, m.index).trim()
  if (desc.length < 3) return null
  return {
    id: createId('txn'),
    importId,
    sourceType,
    kind: 'CARD_PURCHASE',
    amount,
    date: normalizeDate(prev),
    description: desc,
    reconciliationState: 'AutoMatched',
    spendImpact: 'SPEND',
  }
}

function isDbsStandaloneSgdAmountLine(l: string): boolean {
  return /^\d{1,3}(?:,\d{3})*\.\d{2}\s*(CR)?$/i.test(l.trim())
}

function isDbsBillPaymentDescription(desc: string): boolean {
  const u = desc.toUpperCase()
  return u.includes('BILL PAYMENT') && (u.includes('DBS') || u.includes('INTERNET') || u.includes('WIRELESS'))
}

function shouldSkipDbsGridDesc(desc: string): boolean {
  const u = desc.toUpperCase().trim()
  if (u.length < 2) return true
  if (u.startsWith('SUB-TOTAL') || u.startsWith('SUBTOTAL')) return true
  if (u.startsWith('TOTAL:') || u === 'TOTAL') return true
  if (u.includes('PREVIOUS BALANCE')) return true
  if (/^NEW TRANSACTIONS\b/i.test(desc.trim())) return true
  return false
}

function tryConsumeDbsCardGridRow(
  lines: string[],
  i: number,
  importId: string,
  year: number,
): GridRowResult | null {
  if (!looksLikeDdMmm(lines[i] ?? '')) return null

  const isoDate = (() => {
    const d = parseDdMmmWithYear(lines[i] ?? '', year)
    return d ? toIsoDateString(d) : null
  })()
  if (!isoDate) return null

  const limit = Math.min(lines.length, i + 22)
  let j = i + 1
  const descParts: string[] = []
  let reference: string | undefined

  while (j < limit) {
    const raw = lines[j] ?? ''
    const l = raw.trim()
    if (!l) {
      j += 1
      continue
    }

    if (/^REF\s*NO/i.test(l)) {
      reference = l.replace(/^REF\s*NO\.?\s*:?\s*/i, '').trim()
      j += 1
      continue
    }

    if (isDbsStandaloneSgdAmountLine(l)) {
      const amount = moneyFromLine(l)
      if (amount === null) return null
      const nextTrim = (lines[j + 1] ?? '').trim().toUpperCase()
      const crOnNextLine = nextTrim === 'CR'
      const hasCr = l.toUpperCase().includes('CR') || crOnNextLine

      const desc = descParts.join(' ').trim()
      if (shouldSkipDbsGridDesc(desc)) return null

      const consumed = j - i + 1 + (crOnNextLine ? 1 : 0)

      if (hasCr) {
        const bill = isDbsBillPaymentDescription(desc)
        const description = bill ? 'DBS card bill payment credit' : 'DBS card payment credit'
        return {
          txn: {
            id: createId('txn'),
            importId,
            sourceType: 'DBS_CARD',
            kind: 'CARD_CREDIT',
            amount,
            date: isoDate,
            description,
            reference,
            reconciliationState: 'NeedsReview',
            spendImpact: 'UNRESOLVED_REVIEW',
          },
          consumed,
        }
      }

      return {
        txn: {
          id: createId('txn'),
          importId,
          sourceType: 'DBS_CARD',
          kind: 'CARD_PURCHASE',
          amount,
          date: isoDate,
          description: desc,
          reference,
          reconciliationState: 'AutoMatched',
          spendImpact: 'SPEND',
        },
        consumed: j - i + 1,
      }
    }

    descParts.push(l)
    j += 1
  }

  return null
}

function extractAllDbsCardTransactions(lines: string[], importId: string, fullText: string): Transaction[] {
  const year = inferStatementYearFromText(fullText) ?? new Date().getUTCFullYear()
  const consumed = new Set<number>()
  const out: Transaction[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const row = tryConsumeDbsCardGridRow(lines, i, importId, year)
    if (!row) continue
    for (let k = i; k < i + row.consumed; k += 1) consumed.add(k)
    out.push(row.txn)
    i += row.consumed - 1
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (consumed.has(i)) continue
    const credit = tryDbsCardLine(lines, i, importId, 'DBS_CARD')
    if (credit) {
      out.push(credit)
      continue
    }
    const purchase = tryDbsCardPurchaseLine(lines, i, importId, 'DBS_CARD')
    if (purchase) out.push(purchase)
  }

  return out
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
      if (i === 0) {
        out.push(...extractAllUobCardTransactions(lines, importId, text))
      }
      continue
    }

    if (sourceType === 'DBS_CARD') {
      if (i === 0) {
        out.push(...extractAllDbsCardTransactions(lines, importId, text))
      }
      continue
    }
  }

  return out
}

/** @deprecated Use `parseTransactionsForSource` via `runStatementPipeline`. */
export const parseTransactions = parseTransactionsForSource
