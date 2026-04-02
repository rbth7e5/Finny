/**
 * TKT-019 — Service-layer integration: import → reconcile → monthly status → review.
 * SQLite / Tauri IPC round-trip remains TKT-025.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DBS_BANK_HEADER,
  DBS_CARD_HEADER,
  EMPTY_STATE_PROFILE,
  UOB_BANK_BILL_PAYMENT,
  UOB_BANK_HEADER,
} from '../test/fixtures/statements'

const hoisted = vi.hoisted(() => ({ createIdSeq: 0 }))

vi.mock('../parsers/pdfText', () => ({
  readPdfText: vi.fn(),
}))

vi.mock('../utils/fileHash', () => ({
  sha256HexOfFile: vi.fn(),
}))

vi.mock('../utils/ids', () => ({
  createId: (prefix: string) => {
    hoisted.createIdSeq += 1
    return `${prefix}-id-${hoisted.createIdSeq}`
  },
}))

import { readPdfText } from '../parsers/pdfText'
import { sha256HexOfFile } from '../utils/fileHash'
import type { AppState } from '../domain/types'
import type { ImportPdfResult } from './finnyApp'
import { importPdfStatements, resolveReviewItem } from './finnyApp'
import { getMonthlyStatus, getReviewQueue } from './monthlyClose'

function expectImportOk(r: ImportPdfResult): Extract<ImportPdfResult, { ok: true }> {
  expect(r.ok).toBe(true)
  if (!r.ok) throw new Error(r.userMessage)
  return r
}

const readPdfTextMock = vi.mocked(readPdfText)
const sha256Mock = vi.mocked(sha256HexOfFile)

const emptyState = (): AppState => ({
  imports: [],
  transactions: [],
  profile: { ...EMPTY_STATE_PROFILE },
})

/** DBS bank + card snippets with matching amount and REF so reconcile AutoMatches (no review queue). */
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

describe('TKT-019 integration (in-memory pipeline)', () => {
  beforeEach(() => {
    hoisted.createIdSeq = 0
    vi.clearAllMocks()
  })

  it('import → reconcile: DBS bank + card with matching ref yields zero items needing review', async () => {
    const { bank, card } = dbsMatchedPairText()
    sha256Mock.mockResolvedValueOnce('hash-bank').mockResolvedValueOnce('hash-card')
    readPdfTextMock.mockResolvedValueOnce(bank).mockResolvedValueOnce(card)

    const r = expectImportOk(
      await importPdfStatements(emptyState(), [
        new File(['1'], 'dbs-bank.pdf', { type: 'application/pdf' }),
        new File(['2'], 'dbs-card.pdf', { type: 'application/pdf' }),
      ]),
    )

    expect(r.userMessage).toMatch(/0 item\(s\) need review/)
    expect(r.next.transactions.every((t) => t.reconciliationState !== 'NeedsReview')).toBe(true)
  })

  it('monthly status: RESOLVE_REVIEW → VIEW_SUMMARY after resolving the only review item (four imports present)', () => {
    const imports: AppState['imports'] = [
      {
        id: 'i1',
        fileName: 'a.pdf',
        sourceType: 'UOB_BANK',
        importedAt: '2025-01-10T00:00:00.000Z',
        status: 'SUCCESS',
      },
      {
        id: 'i2',
        fileName: 'b.pdf',
        sourceType: 'DBS_BANK',
        importedAt: '2025-01-11T00:00:00.000Z',
        status: 'SUCCESS',
      },
      {
        id: 'i3',
        fileName: 'c.pdf',
        sourceType: 'UOB_CARD',
        importedAt: '2025-01-12T00:00:00.000Z',
        status: 'SUCCESS',
      },
      {
        id: 'i4',
        fileName: 'd.pdf',
        sourceType: 'DBS_CARD',
        importedAt: '2025-01-13T00:00:00.000Z',
        status: 'SUCCESS',
      },
    ]
    const state: AppState = {
      imports,
      transactions: [
        {
          id: 'review-1',
          importId: 'i1',
          sourceType: 'UOB_BANK',
          kind: 'BANK_SETTLEMENT',
          amount: 1,
          date: '2025-01-01',
          description: 'pending',
          reconciliationState: 'NeedsReview',
          spendImpact: 'UNRESOLVED_REVIEW',
        },
      ],
      profile: { ...EMPTY_STATE_PROFILE },
    }

    expect(getMonthlyStatus(state).nextAction).toBe('RESOLVE_REVIEW')
    expect(getReviewQueue(state)).toHaveLength(1)

    const after = resolveReviewItem(state, 'review-1', 'confirm')
    expect(getMonthlyStatus(after).nextAction).toBe('VIEW_SUMMARY')
    expect(getReviewQueue(after)).toHaveLength(0)
  })

  it('import single bank only → monthly status stays IMPORT_MISSING', async () => {
    sha256Mock.mockResolvedValue('one-bank')
    readPdfTextMock.mockResolvedValue(`${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`)

    const r = expectImportOk(
      await importPdfStatements(emptyState(), [new File(['x'], 'uob.pdf', { type: 'application/pdf' })]),
    )

    expect(getMonthlyStatus(r.next).nextAction).toBe('IMPORT_MISSING')
    expect(getMonthlyStatus(r.next).reasonText).toMatch(/3 required statement/)
  })

  it('re-import idempotency: second identical ledger row skipped; pipeline still completes', async () => {
    sha256Mock.mockResolvedValueOnce('h1').mockResolvedValueOnce('h2')
    const text = `${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`
    readPdfTextMock.mockResolvedValue(text)

    const first = expectImportOk(await importPdfStatements(emptyState(), [new File(['1'], 'a.pdf')]))
    const second = expectImportOk(await importPdfStatements(first.next, [new File(['2'], 'b.pdf')]))

    expect(second.session.skippedDuplicateTxnCount).toBeGreaterThan(0)
    expect(second.next.transactions.length).toBe(first.next.transactions.length)
  })
})
