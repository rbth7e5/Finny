import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
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
import type { ImportPdfResult } from './finnyApp'
import { importPdfStatements, resolveReviewItem, updateRuleProfile } from './finnyApp'

/** Narrows union so `tsc -b` accepts `.next` (Vitest's `expect` does not narrow). */
function expectImportOk(r: ImportPdfResult): Extract<ImportPdfResult, { ok: true }> {
  expect(r.ok).toBe(true)
  if (!r.ok) {
    throw new Error(r.userMessage)
  }
  return r
}

const readPdfTextMock = vi.mocked(readPdfText)
const sha256Mock = vi.mocked(sha256HexOfFile)

const emptyState = () => ({
  imports: [] as import('../domain/types').ImportRecord[],
  transactions: [] as import('../domain/types').Transaction[],
  profile: { ...EMPTY_STATE_PROFILE },
})

describe('importPdfStatements (PRD Scenario B / FR-2 duplicate handling)', () => {
  beforeEach(() => {
    hoisted.createIdSeq = 0
    vi.clearAllMocks()
  })

  it('imports PDFs, parses, reconciles, and sets contentHash on success', async () => {
    sha256Mock.mockResolvedValue('hash-new-1')
    readPdfTextMock.mockResolvedValue(`${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`)

    const r = expectImportOk(
      await importPdfStatements(emptyState(), [new File(['x'], 'stmt.pdf', { type: 'application/pdf' })]),
    )

    expect(r.next.imports).toHaveLength(1)
    expect(r.next.imports[0]!.contentHash).toBe('hash-new-1')
    expect(r.next.imports[0]!.status).toBe('SUCCESS')
    expect(r.next.transactions.length).toBeGreaterThanOrEqual(1)
    expect(r.userMessage).toMatch(/Import complete/)
  })

  it('skips duplicate file when same hash already imported successfully (non-destructive)', async () => {
    const state = emptyState()
    state.imports.push({
      id: 'imp-existing',
      fileName: 'first.pdf',
      sourceType: 'UOB_BANK',
      importedAt: '2020-01-01',
      status: 'SUCCESS',
      contentHash: 'same-hash',
    })

    sha256Mock.mockResolvedValue('same-hash')
    const r = expectImportOk(
      await importPdfStatements(state, [new File(['y'], 'dup.pdf', { type: 'application/pdf' })]),
    )

    expect(r.next.imports).toHaveLength(1)
    expect(readPdfTextMock).not.toHaveBeenCalled()
    expect(r.userMessage).toMatch(/Skipped 1 duplicate file/i)
  })

  it('does not skip duplicate hash if prior import failed (allows retry)', async () => {
    const state = emptyState()
    state.imports.push({
      id: 'imp-fail',
      fileName: 'bad.pdf',
      sourceType: 'UNKNOWN',
      importedAt: '2020-01-01',
      status: 'FAILED',
      contentHash: 'retry-hash',
    })

    sha256Mock.mockResolvedValue('retry-hash')
    readPdfTextMock.mockResolvedValue(`${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`)

    const r = expectImportOk(
      await importPdfStatements(state, [new File(['z'], 'retry.pdf', { type: 'application/pdf' })]),
    )

    expect(r.next.imports.length).toBe(2)
    expect(readPdfTextMock).toHaveBeenCalled()
  })

  it('skips transaction rows that fingerprint-match existing ledger', async () => {
    sha256Mock.mockResolvedValueOnce('h-a').mockResolvedValueOnce('h-b')
    const text = `${UOB_BANK_HEADER}\n${UOB_BANK_BILL_PAYMENT}`
    readPdfTextMock.mockResolvedValue(text)

    const first = expectImportOk(await importPdfStatements(emptyState(), [new File(['1'], 'a.pdf')]))
    const nAfterFirst = first.next.transactions.length

    const second = expectImportOk(await importPdfStatements(first.next, [new File(['2'], 'b.pdf')]))
    expect(second.next.transactions.length).toBe(nAfterFirst)
    expect(second.userMessage).toMatch(/duplicate transaction row/i)
  })
})

describe('resolveReviewItem (PRD manual review)', () => {
  it('confirm sets UserConfirmed and SETTLEMENT_EXCLUDED', () => {
    const state = emptyState()
    state.transactions.push({
      id: 't1',
      importId: 'i',
      sourceType: 'UOB_BANK',
      kind: 'BANK_SETTLEMENT',
      amount: 1,
      date: 'd',
      description: 'x',
      reconciliationState: 'NeedsReview',
      spendImpact: 'UNRESOLVED_REVIEW',
    })
    const next = resolveReviewItem(state, 't1', 'confirm')
    const t = next.transactions.find((x) => x.id === 't1')!
    expect(t.reconciliationState).toBe('UserConfirmed')
    expect(t.spendImpact).toBe('SETTLEMENT_EXCLUDED')
  })

  it('override sets UserOverridden and TRANSFER', () => {
    const state = emptyState()
    state.transactions.push({
      id: 't2',
      importId: 'i',
      sourceType: 'UOB_BANK',
      kind: 'BANK_SETTLEMENT',
      amount: 2,
      date: 'd',
      description: 'y',
      reconciliationState: 'NeedsReview',
      spendImpact: 'UNRESOLVED_REVIEW',
    })
    const next = resolveReviewItem(state, 't2', 'override')
    const t = next.transactions.find((x) => x.id === 't2')!
    expect(t.reconciliationState).toBe('UserOverridden')
    expect(t.spendImpact).toBe('TRANSFER')
  })

  it('confirm updates linked card counterpart to UserConfirmed and SETTLEMENT_EXCLUDED', () => {
    const state = emptyState()
    state.transactions.push(
      {
        id: 'bank',
        importId: 'i',
        sourceType: 'UOB_BANK',
        kind: 'BANK_SETTLEMENT',
        amount: 100,
        date: 'd',
        description: 'pay card',
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
        linkedTransactionId: 'card',
      },
      {
        id: 'card',
        importId: 'i',
        sourceType: 'UOB_CARD',
        kind: 'CARD_CREDIT',
        amount: 100,
        date: 'd',
        description: 'payment',
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
        linkedTransactionId: 'bank',
      },
    )
    const next = resolveReviewItem(state, 'bank', 'confirm')
    const b = next.transactions.find((x) => x.id === 'bank')!
    const c = next.transactions.find((x) => x.id === 'card')!
    expect(b.reconciliationState).toBe('UserConfirmed')
    expect(b.spendImpact).toBe('SETTLEMENT_EXCLUDED')
    expect(c.reconciliationState).toBe('UserConfirmed')
    expect(c.spendImpact).toBe('SETTLEMENT_EXCLUDED')
    expect(b.linkedTransactionId).toBe('card')
    expect(c.linkedTransactionId).toBe('bank')
  })

  it('override clears link and sets counterpart spend for CARD_CREDIT to SPEND', () => {
    const state = emptyState()
    state.transactions.push(
      {
        id: 'bank',
        importId: 'i',
        sourceType: 'UOB_BANK',
        kind: 'BANK_SETTLEMENT',
        amount: 50,
        date: 'd',
        description: 'x',
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
        linkedTransactionId: 'card',
      },
      {
        id: 'card',
        importId: 'i',
        sourceType: 'UOB_CARD',
        kind: 'CARD_CREDIT',
        amount: 50,
        date: 'd',
        description: 'y',
        reconciliationState: 'NeedsReview',
        spendImpact: 'UNRESOLVED_REVIEW',
        linkedTransactionId: 'bank',
      },
    )
    const next = resolveReviewItem(state, 'bank', 'override')
    const b = next.transactions.find((x) => x.id === 'bank')!
    const c = next.transactions.find((x) => x.id === 'card')!
    expect(b.linkedTransactionId).toBeUndefined()
    expect(c.linkedTransactionId).toBeUndefined()
    expect(b.reconciliationState).toBe('UserOverridden')
    expect(b.spendImpact).toBe('TRANSFER')
    expect(c.reconciliationState).toBe('UserOverridden')
    expect(c.spendImpact).toBe('SPEND')
  })
})

describe('updateRuleProfile', () => {
  it('merges profile fields', () => {
    const s = emptyState()
    const next = updateRuleProfile(s, { matchWindowDays: 12 })
    expect(next.profile.matchWindowDays).toBe(12)
    expect(next.profile.confidenceThreshold).toBe(EMPTY_STATE_PROFILE.confidenceThreshold)
  })
})
