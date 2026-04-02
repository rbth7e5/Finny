use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub imports: Vec<ImportRecord>,
    pub transactions: Vec<Transaction>,
    pub profile: RuleProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRecord {
    pub id: String,
    pub file_name: String,
    pub source_type: String,
    pub imported_at: String,
    pub status: String,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub import_id: String,
    pub source_type: String,
    pub kind: String,
    pub amount: f64,
    pub date: String,
    pub description: String,
    pub card_token: Option<String>,
    pub reference: Option<String>,
    pub reconciliation_state: String,
    pub spend_impact: String,
    pub linked_transaction_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleProfile {
    pub match_window_days: i32,
    pub confidence_threshold: f64,
}
