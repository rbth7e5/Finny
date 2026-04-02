use tauri::AppHandle;

use crate::db;
use crate::state::AppState;

#[tauri::command]
pub fn finny_load_state(app: AppHandle) -> Result<AppState, String> {
    let conn = db::open_connection(&app)?;
    db::migrate(&conn).map_err(|e| e.to_string())?;
    db::load_state(&conn)
}

#[tauri::command]
pub fn finny_save_state(app: AppHandle, state: AppState) -> Result<(), String> {
    let mut conn = db::open_connection(&app)?;
    db::migrate(&conn).map_err(|e| e.to_string())?;
    db::save_state(&mut conn, &state).map_err(|e| e.to_string())
}
