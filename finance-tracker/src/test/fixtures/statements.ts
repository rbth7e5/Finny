/**
 * Minimal text shapes used by parsers (aligned with PRODUCT_REQUIREMENTS FR-2/FR-3).
 * Real PDFs vary; these assert current deterministic parser behavior.
 */

export const UOB_BANK_BILL_PAYMENT = `
2024-01-10
Bill Payment
mBK-UOB Cards
4111 1111 1111 1111
1,234.56
Other
`.trim()

export const DBS_BANK_BILL_PAYMENT = `
2024-02-01
Advice Bill Payment
DBSC-4111111111111111
REF: ABC123XYZ
999.99
`.trim()

export const DBS_BANK_FAST = `
2024-02-02
Advice FAST Payment / Receipt
50.00
`.trim()

export const UOB_CARD_EBANK = `
2024-03-01
PAYMT THRU E-BANK/HOMEB/CYBERB 500.00
Ref No. : REFUOB1
`.trim()

export const DBS_CARD_BILL = `
2024-04-01
BILL PAYMENT - DBS INTERNET/WIRELESS
line
750.25
REF NO: RDBS1
`.trim()

export const UOB_CARD_HEADER = 'Credit Card(s) Statement UOB'
export const UOB_BANK_HEADER = 'Statement of Account One Account'
export const DBS_BANK_HEADER = 'Consolidated Statement DBS Multiplier'
export const DBS_CARD_HEADER = 'DBS Credit Cards Statement of Account'

export const EMPTY_STATE_PROFILE = {
  matchWindowDays: 5,
  confidenceThreshold: 0.75,
} as const
