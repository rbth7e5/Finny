import { describe, expect, it } from 'vitest'
import { sha256HexOfFile } from './fileHash'

describe('sha256HexOfFile (ENG §7.1 content hash)', () => {
  it('returns 64-char lowercase hex', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 't.pdf', { type: 'application/pdf' })
    const hex = await sha256HexOfFile(file)
    expect(hex).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is stable for identical bytes (idempotent import key)', async () => {
    const bytes = new Uint8Array([9, 9, 9])
    const a = new File([bytes], 'a.pdf')
    const b = new File([bytes], 'b.pdf')
    expect(await sha256HexOfFile(a)).toBe(await sha256HexOfFile(b))
  })

  it('differs when content differs', async () => {
    const x = new File([new Uint8Array([1])], 'x.pdf')
    const y = new File([new Uint8Array([2])], 'y.pdf')
    expect(await sha256HexOfFile(x)).not.toBe(await sha256HexOfFile(y))
  })
})
