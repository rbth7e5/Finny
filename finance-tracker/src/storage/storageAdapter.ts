import type { AppState } from '../domain/types'

export interface StorageAdapter {
  load(): Promise<AppState>
  save(state: AppState): Promise<void>
}
