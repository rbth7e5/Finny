use rusqlite::{params, Connection};
use tauri::AppHandle;
use tauri::Manager;

use crate::state::{AppState, ImportRecord, RuleProfile, Transaction};

pub fn open_connection(app: &AppHandle) -> Result<Connection, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("finny");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("finny.db");
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> Result<(), rusqlite::Error> {
    let v: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if v >= 1 {
        return Ok(());
    }

    conn.execute_batch(
        r#"
        CREATE TABLE rule_profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          match_window_days INTEGER NOT NULL,
          confidence_threshold REAL NOT NULL
        );
        INSERT INTO rule_profile (id, match_window_days, confidence_threshold)
          VALUES (1, 5, 0.75);

        CREATE TABLE imports (
          id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          source_type TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          status TEXT NOT NULL,
          warning TEXT
        );

        CREATE TABLE transactions (
          id TEXT PRIMARY KEY,
          import_id TEXT NOT NULL,
          source_type TEXT NOT NULL,
          kind TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          description TEXT NOT NULL,
          card_token TEXT,
          reference TEXT,
          reconciliation_state TEXT NOT NULL,
          spend_impact TEXT NOT NULL,
          linked_transaction_id TEXT,
          FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_transactions_import ON transactions(import_id);

        CREATE TABLE reconciliation_links (
          id TEXT PRIMARY KEY,
          bank_transaction_id TEXT NOT NULL,
          card_transaction_id TEXT NOT NULL,
          UNIQUE(bank_transaction_id, card_transaction_id),
          FOREIGN KEY (bank_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
          FOREIGN KEY (card_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE TABLE monthly_status (
          month_key TEXT PRIMARY KEY,
          status_code TEXT NOT NULL DEFAULT 'UNKNOWN',
          detail_json TEXT NOT NULL DEFAULT '{}'
        );
        "#,
    )?;

    conn.pragma_update(None, "user_version", 1)?;
    Ok(())
}

pub fn load_state(conn: &Connection) -> Result<AppState, String> {
    let profile: RuleProfile = conn
        .query_row(
            "SELECT match_window_days, confidence_threshold FROM rule_profile WHERE id = 1",
            [],
            |row| {
                Ok(RuleProfile {
                    match_window_days: row.get(0)?,
                    confidence_threshold: row.get(1)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut imp_stmt = conn
        .prepare(
            "SELECT id, file_name, source_type, imported_at, status, warning FROM imports ORDER BY imported_at",
        )
        .map_err(|e| e.to_string())?;
    let imports: Vec<ImportRecord> = imp_stmt
        .query_map([], |row| {
            Ok(ImportRecord {
                id: row.get(0)?,
                file_name: row.get(1)?,
                source_type: row.get(2)?,
                imported_at: row.get(3)?,
                status: row.get(4)?,
                warning: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut txn_stmt = conn
        .prepare(
            "SELECT id, import_id, source_type, kind, amount, date, description, card_token, reference,
                    reconciliation_state, spend_impact, linked_transaction_id
             FROM transactions ORDER BY date, id",
        )
        .map_err(|e| e.to_string())?;
    let transactions: Vec<Transaction> = txn_stmt
        .query_map([], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                import_id: row.get(1)?,
                source_type: row.get(2)?,
                kind: row.get(3)?,
                amount: row.get(4)?,
                date: row.get(5)?,
                description: row.get(6)?,
                card_token: row.get(7)?,
                reference: row.get(8)?,
                reconciliation_state: row.get(9)?,
                spend_impact: row.get(10)?,
                linked_transaction_id: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(AppState {
        imports,
        transactions,
        profile,
    })
}

pub fn save_state(conn: &mut Connection, state: &AppState) -> Result<(), rusqlite::Error> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM reconciliation_links", [])?;
    tx.execute("DELETE FROM transactions", [])?;
    tx.execute("DELETE FROM imports", [])?;

    for i in &state.imports {
        tx.execute(
            "INSERT INTO imports (id, file_name, source_type, imported_at, status, warning)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                i.id,
                i.file_name,
                i.source_type,
                i.imported_at,
                i.status,
                i.warning
            ],
        )?;
    }

    for t in &state.transactions {
        tx.execute(
            "INSERT INTO transactions (
               id, import_id, source_type, kind, amount, date, description,
               card_token, reference, reconciliation_state, spend_impact, linked_transaction_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                t.id,
                t.import_id,
                t.source_type,
                t.kind,
                t.amount,
                t.date,
                t.description,
                t.card_token,
                t.reference,
                t.reconciliation_state,
                t.spend_impact,
                t.linked_transaction_id
            ],
        )?;
    }

    for t in &state.transactions {
        if t.kind == "BANK_SETTLEMENT" {
            if let Some(card_id) = &t.linked_transaction_id {
                let link_id = format!("lnk-{}-{}", t.id, card_id);
                tx.execute(
                    "INSERT INTO reconciliation_links (id, bank_transaction_id, card_transaction_id)
                     VALUES (?1, ?2, ?3)",
                    params![link_id, t.id, card_id],
                )?;
            }
        }
    }

    tx.execute(
        "UPDATE rule_profile SET match_window_days = ?1, confidence_threshold = ?2 WHERE id = 1",
        params![state.profile.match_window_days, state.profile.confidence_threshold],
    )?;

    tx.commit()?;
    Ok(())
}
