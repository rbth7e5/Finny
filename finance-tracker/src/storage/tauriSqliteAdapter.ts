import { invoke, isTauri } from '@tauri-apps/api/core'
import type { AppState } from '../domain/types'
import type { StorageAdapter } from './storageAdapter'

const NOT_IN_TAURI_MESSAGE =
  'This page is not running inside the Finny desktop window, so SQLite cannot load. ' +
  'Do not open the Vite dev URL in a normal browser. From the finance-tracker folder run: npx tauri dev'

/** Persists app state in the Tauri-side SQLite database (see `src-tauri/src/db.rs`). */
export class TauriSqliteAdapter implements StorageAdapter {
  async load(): Promise<AppState> {
    if (!isTauri()) {
      throw new Error(NOT_IN_TAURI_MESSAGE)
    }
    return invoke<AppState>('finny_load_state')
  }

  async save(state: AppState): Promise<void> {
    if (!isTauri()) {
      throw new Error(NOT_IN_TAURI_MESSAGE)
    }
    await invoke('finny_save_state', { state })
  }
}
