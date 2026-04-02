import type { AppState } from './types'

export const DEFAULT_STATE: AppState = {
  imports: [],
  transactions: [],
  profile: { matchWindowDays: 5, confidenceThreshold: 0.75 },
}
