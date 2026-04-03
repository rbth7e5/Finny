/**
 * TKT-020 — Golden snapshots: deterministic import → reconcile outcomes vs checked-in JSON.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState } from '../../domain/types'
import type { ImportPdfResult } from '../../appServices/finnyApp'
import { importPdfStatements } from '../../appServices/finnyApp'
import {
  DBS_BANK_HEADER,
  DBS_CARD_HEADER,
  EMPTY_STATE_PROFILE,
  UOB_BANK_BILL_PAYMENT,
  UOB_BANK_HEADER,
  UOB_CARD_HEADER,
} from '../fixtures/statements'
import { buildGoldenSnapshot, type GoldenSnapshot } from './goldenSnapshot'

const hoisted = vi.hoisted(() => ({ createIdSeq: 0 }))

vi.mock('../../parsers/pdfText', () => ({
  readPdfText: vi.fn(),
}))

vi.mock('../../utils/fileHash', () => ({
  sha256HexOfFile: vi.fn(),
}))

vi.mock('../../utils/ids', () => ({
  createId: (prefix: string) => {
    hoisted.createIdSeq += 1
    return `${prefix}-id-${hoisted.createIdSeq}`
  },
}))

import { readPdfText } from '../../parsers/pdfText'
import { sha256HexOfFile } from '../../utils/fileHash'

const readPdfTextMock = vi.mocked(readPdfText)
const sha256Mock = vi.mocked(sha256HexOfFile)

function loadGolden(name: string): GoldenSnapshot {
  const path = fileURLToPath(new URL(`./${name}.expected.json`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf-8')) as GoldenSnapshot
}

function expectImportOk(r: ImportPdfResult): Extract<ImportPdfResult, { ok: true }> {
  expect(r.ok).toBe(true)
  if (!r.ok) throw new Error(r.userMessage)
  return r
}

const emptyState = (): AppState => ({
  imports: [],
  transactions: [],
  profile: { ...EMPTY_STATE_PROFILE },
})

/** DBS bank + card with matching amount and REF (AutoMatched settlement pair). */
function dbsMatchedPairText(): { bank: string; card: string } {
  const bank = [
    DBS_BANK_HEADER,
    '2024-02-01',
    'Advice Bill Payment',
    'DBSC-4111111111111111',
    'REF: GOLD19',
    '888.88',
  ].join('\n')
  const card = [
    DBS_CARD_HEADER,
    '2024-02-01',
    'BILL PAYMENT - DBS INTERNET/WIRELESS',
    'detail',
    '888.88',
    'REF NO: GOLD19',
  ].join('\n')
  return { bank, card }
}

/** UOB bank bill payment + UOB card credit: same amount/date, ref boost absent → below auto-match threshold. */
function uobSameAmountBelowThresholdText(): { bank: string; card: string } {
  const bank = [UOB_BANK_HEADER, UOB_BANK_BILL_PAYMENT].join('\n')
  const card = [
    UOB_CARD_HEADER,
    '2024-01-10',
    'PAYMT THRU E-BANK/HOMEB/CYBERB 1,234.56',
    'Ref No. : UOBPAIR1',
  ].join('\n')
  return { bank, card }
}

describe('TKT-020 golden snapshots', () => {
  beforeEach(() => {
    hoisted.createIdSeq = 0
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dbs-settlement-automatch: ref + amount → AutoMatched pair, zero review', async () => {
    const { bank, card } = dbsMatchedPairText()
    sha256Mock.mockResolvedValueOnce('golden-hash-bank').mockResolvedValueOnce('golden-hash-card')
    readPdfTextMock.mockResolvedValueOnce(bank).mockResolvedValueOnce(card)

    const r = expectImportOk(
      await importPdfStatements(emptyState(), [
        new File(['1'], 'dbs-bank.pdf', { type: 'application/pdf' }),
        new File(['2'], 'dbs-card.pdf', { type: 'application/pdf' }),
      ]),
    )

    const actual = buildGoldenSnapshot(r.next, 0)
    expect(actual).toEqual(loadGolden('dbs-settlement-automatch'))
  })

  it('uob-same-amount-below-threshold: amount/date match without DBS-style ref boost → NeedsReview', async () => {
    const { bank, card } = uobSameAmountBelowThresholdText()
    sha256Mock.mockResolvedValueOnce('golden-uob-bank').mockResolvedValueOnce('golden-uob-card')
    readPdfTextMock.mockResolvedValueOnce(bank).mockResolvedValueOnce(card)

    const r = expectImportOk(
      await importPdfStatements(emptyState(), [
        new File(['1'], 'uob-bank.pdf', { type: 'application/pdf' }),
        new File(['2'], 'uob-card.pdf', { type: 'application/pdf' }),
      ]),
    )

    const actual = buildGoldenSnapshot(r.next, r.next.transactions.filter((t) => t.reconciliationState === 'NeedsReview').length)
    expect(actual).toEqual(loadGolden('uob-same-amount-below-threshold'))
  })
})
