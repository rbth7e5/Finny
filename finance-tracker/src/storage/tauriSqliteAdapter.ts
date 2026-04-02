import { invoke } from '@tauri-apps/api/core'
import type { AppState } from '../domain/types'
import type { StorageAdapter } from './storageAdapter'

/** Persists app state in the Tauri-side SQLite database (see `src-tauri/src/db.rs`). */
export class TauriSqliteAdapter implements StorageAdapter {
  async load(): Promise<AppState> {
    return invoke<AppState>('finny_load_state')
  }

  async save(state: AppState): Promise<void> {
    await invoke('finny_save_state', { state })
  }
}
