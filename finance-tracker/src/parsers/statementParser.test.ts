import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DBS_BANK_BILL_PAYMENT,
  DBS_BANK_FAST,
  DBS_BANK_HEADER,
  DBS_CARD_BILL,
  DBS_CARD_HEADER,
  UOB_BANK_BILL_PAYMENT,
  UOB_BANK_HEADER,
  UOB_CARD_EBANK,
  UOB_CARD_HEADER,
} from '../test/fixtures/statements'
import { detectSource, parseTransactionsForSource } from './statementParser'

describe('detectSource', () => {
  it('classifies UOB bank (Statement of Account + One Account)', () => {
    expect(detectSource(`${UOB_BANK_HEADER} ${UOB_BANK_BILL_PAYMENT}`)).toBe('UOB_BANK')
  })

  it('classifies UOB card (Credit Card(s) Statement)', () => {
    expect(detectSource(`${UOB_CARD_HEADER} ${UOB_CARD_EBANK}`)).toBe('UOB_CARD')
  })

  it('classifies DBS bank (Consolidated Statement + Multiplier)', () => {
    expect(detectSource(`${DBS_BANK_HEADER} ${DBS_BANK_BILL_PAYMENT}`)).toBe('DBS_BANK')
  })

  it('classifies DBS card (Credit Cards + Statement of Account + DBS)', () => {
    expect(detectSource(`${DBS_CARD_HEADER} ${DBS_CARD_BILL}`)).toBe('DBS_CARD')
  })

  it('returns UNKNOWN for unrecognized blobs (FR-2)', () => {
    expect(detectSource('Random PDF text with no markers')).toBe('UNKNOWN')
  })
})

describe('parseTransactionsForSource', () => {
  beforeEach(() => {
    let n = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    )
  })

  it('extracts UOB bank settlement rows (FR-3 normalization)', () => {
    const tx = parseTransactionsForSource(UOB_BANK_BILL_PAYMENT, 'UOB_BANK', 'imp-1')
    expect(tx).toHaveLength(1)
    expect(tx[0]!.kind).toBe('BANK_SETTLEMENT')
    expect(tx[0]!.amount).toBe(1234.56)
    expect(tx[0]!.date).toBe('2024-01-10')
    expect(tx[0]!.sourceType).toBe('UOB_BANK')
    expect(tx[0]!.importId).toBe('imp-1')
    expect(tx[0]!.cardToken).toBe('4111111111111111')
  })

  it('extracts DBS bank bill payment with reference', () => {
    const tx = parseTransactionsForSource(DBS_BANK_BILL_PAYMENT, 'DBS_BANK', 'imp-2')
    const bill = tx.find((t) => t.kind === 'BANK_SETTLEMENT')
    expect(bill).toBeDefined()
    expect(bill!.amount).toBe(999.99)
    expect(bill!.reference).toBe('ABC123XYZ')
    expect(bill!.description).toContain('DBSC-')
  })

  it('extracts DBS FAST transfer as TRANSFER', () => {
    const tx = parseTransactionsForSource(DBS_BANK_FAST, 'DBS_BANK', 'imp-3')
    const tr = tx.find((t) => t.kind === 'TRANSFER')
    expect(tr).toBeDefined()
    expect(tr!.amount).toBe(50)
    expect(tr!.spendImpact).toBe('TRANSFER')
  })

  it('extracts UOB card credit (e-bank payment line)', () => {
    const tx = parseTransactionsForSource(UOB_CARD_EBANK, 'UOB_CARD', 'imp-4')
    expect(tx.length).toBeGreaterThanOrEqual(1)
    const c = tx.find((t) => t.kind === 'CARD_CREDIT')
    expect(c).toBeDefined()
    expect(c!.amount).toBe(500)
    expect(c!.reference).toBe('REFUOB1')
  })

  it('extracts DBS card credit (bill payment line)', () => {
    const tx = parseTransactionsForSource(DBS_CARD_BILL, 'DBS_CARD', 'imp-5')
    const c = tx.find((t) => t.kind === 'CARD_CREDIT')
    expect(c).toBeDefined()
    expect(c!.amount).toBe(750.25)
  })
})
