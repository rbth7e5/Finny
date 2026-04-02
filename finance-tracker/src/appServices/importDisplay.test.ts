import { describe, expect, it } from 'vitest'
import type { ImportRecord } from '../domain/types'
import {
  buildImportSessionBanner,
  classifyImportRow,
  importFailureCategory,
} from './importDisplay'

function rec(p: Partial<ImportRecord> & Pick<ImportRecord, 'id' | 'fileName' | 'sourceType'>): ImportRecord {
  return {
    importedAt: 't',
    status: 'SUCCESS',
    ...p,
  }
}

describe('classifyImportRow (TKT-013)', () => {
  it('success: clean SUCCESS import', () => {
    const c = classifyImportRow(rec({ id: '1', fileName: 'a.pdf', sourceType: 'UOB_BANK' }))
    expect(c.outcome).toBe('success')
    expect(c.badgeLabel).toMatch(/success/i)
  })

  it('partial: SUCCESS with parser info (no rows matched)', () => {
    const c = classifyImportRow(
      rec({
        id: '1',
        fileName: 'b.pdf',
        sourceType: 'DBS_BANK',
        warning: 'No rows matched known patterns for this statement type',
      }),
    )
    expect(c.outcome).toBe('partial')
    expect(c.badgeLabel).toMatch(/imported|check info/i)
    expect(c.detail).toBeTruthy()
  })

  it('failed: FAILED unrecognized', () => {
    const c = classifyImportRow(
      rec({
        id: '1',
        fileName: 'bad.pdf',
        sourceType: 'UNKNOWN',
        status: 'FAILED',
        warning: 'Unrecognized statement format',
      }),
    )
    expect(c.outcome).toBe('failed')
    expect(c.badgeLabel).toMatch(/failed/i)
  })
})

describe('importFailureCategory', () => {
  it('maps unrecognized copy to taxonomy label', () => {
    expect(importFailureCategory('Unrecognized statement format')).toBe('UNRECOGNIZED_STATEMENT_TYPE')
  })

  it('returns generic for unknown messages', () => {
    expect(importFailureCategory('Something broke')).toBe('IMPORT_ERROR')
  })
})

describe('buildImportSessionBanner', () => {
  it('null when no session extras', () => {
    expect(buildImportSessionBanner(undefined)).toBeNull()
    expect(buildImportSessionBanner({ duplicateFileNames: [], skippedDuplicateTxnCount: 0 })).toBeNull()
  })

  it('lists duplicate files', () => {
    const b = buildImportSessionBanner({
      duplicateFileNames: ['a.pdf', 'b.pdf'],
      skippedDuplicateTxnCount: 0,
    })
    expect(b?.tone).toBe('info')
    expect(b?.lines.join(' ')).toMatch(/duplicate/i)
    expect(b?.lines.join(' ')).toMatch(/a\.pdf/)
  })

  it('mentions skipped txn rows', () => {
    const b = buildImportSessionBanner({
      duplicateFileNames: [],
      skippedDuplicateTxnCount: 3,
    })
    expect(b?.tone).toBe('info')
    expect(b?.lines.join(' ')).toMatch(/3/)
    expect(b?.lines.join(' ')).toMatch(/transaction row/i)
  })
})
