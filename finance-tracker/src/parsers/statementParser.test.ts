import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DBS_BANK_BILL_PAYMENT,
  DBS_BANK_FAST,
  DBS_BANK_HEADER,
  DBS_CARD_BILL,
  DBS_CARD_GRID,
  DBS_CARD_HEADER,
  DBS_CARD_RETAIL,
  UOB_BANK_BILL_PAYMENT,
  UOB_BANK_HEADER,
  UOB_CARD_EBANK,
  UOB_CARD_GRID,
  UOB_CARD_HEADER,
  UOB_CARD_RETAIL,
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

  it('extracts UOB card retail line as CARD_PURCHASE (TKT-028)', () => {
    const tx = parseTransactionsForSource(UOB_CARD_RETAIL, 'UOB_CARD', 'imp-6')
    const p = tx.find((t) => t.kind === 'CARD_PURCHASE')
    expect(p).toBeDefined()
    expect(p!.amount).toBe(42.5)
    expect(p!.date).toBe('2024-06-01')
    expect(p!.description).toBe('COLD STORAGE SINGAPORE')
    expect(p!.spendImpact).toBe('SPEND')
    expect(p!.reconciliationState).toBe('AutoMatched')
  })

  it('extracts UOB card PDF grid: CARD_CREDIT, CARD_PURCHASE, FX→SGD', () => {
    const tx = parseTransactionsForSource(UOB_CARD_GRID, 'UOB_CARD', 'imp-grid')
    const credit = tx.find((t) => t.kind === 'CARD_CREDIT')
    expect(credit).toBeDefined()
    expect(credit!.amount).toBe(1089.27)
    expect(credit!.date).toBe('2026-02-28')
    const purchases = tx.filter((t) => t.kind === 'CARD_PURCHASE')
    expect(purchases).toHaveLength(2)
    expect(purchases.map((p) => p.amount).sort((a, b) => a - b)).toEqual([30.74, 718])
    const parkway = purchases.find((p) => p.description.includes('PARKWAY'))
    expect(parkway?.date).toBe('2026-02-21')
    expect(parkway?.reference).toBe('R123')
    const fx = purchases.find((p) => p.description.includes('HO HUNG'))
    expect(fx?.amount).toBe(30.74)
    expect(fx?.date).toBe('2026-02-27')
  })

  it('extracts DBS card retail line as CARD_PURCHASE (TKT-028)', () => {
    const tx = parseTransactionsForSource(DBS_CARD_RETAIL, 'DBS_CARD', 'imp-7')
    const p = tx.find((t) => t.kind === 'CARD_PURCHASE')
    expect(p).toBeDefined()
    expect(p!.amount).toBe(18.9)
    expect(p!.date).toBe('2024-05-20')
    expect(p!.description).toBe('FAIRPRICE FINEST ORCHARD')
  })

  it('extracts DBS card PDF grid: purchases + multi-line desc + bill CR', () => {
    const tx = parseTransactionsForSource(DBS_CARD_GRID, 'DBS_CARD', 'imp-dbs-grid')
    const purchases = tx.filter((t) => t.kind === 'CARD_PURCHASE')
    expect(purchases.map((p) => p.amount).sort((a, b) => a - b)).toEqual([292.87, 319.48])
    const trip = purchases.find((p) => p.description.includes('TRIP'))
    expect(trip?.date).toBe('2026-02-18')
    const agoda = purchases.find((p) => p.description.includes('AGODA'))
    expect(agoda?.description).toMatch(/INTERNET/)
    expect(agoda?.description).toMatch(/HKG/)
    const credit = tx.find((t) => t.kind === 'CARD_CREDIT')
    expect(credit).toBeDefined()
    expect(credit!.amount).toBe(419.13)
    expect(credit!.date).toBe('2026-02-28')
    expect(credit!.reference).toBe('17722779338197485631')
  })
})
