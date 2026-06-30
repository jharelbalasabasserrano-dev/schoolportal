use serde::{Deserialize, Serialize};

fn default_message_status() -> String {
    "Delivered".to_string()
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapData {
    pub accounts: Vec<UserAccount>,
    pub requests: Vec<PortalRequest>,
    pub messages: Vec<RequestMessage>,
    pub announcements: Vec<Announcement>,
    pub inventory: Vec<SupplyItem>,
    pub categories: Vec<SupplyCategory>,
    pub suppliers: Vec<SupplierInfo>,
    pub stock_movements: Vec<StockMovement>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserAccount {
    pub id: String,
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub department: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserAccount {
    pub name: String,
    pub email: String,
    pub role: String,
    pub department: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PortalRequest {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub owner_id: String,
    pub owner: String,
    pub office: String,
    pub status: String,
    pub date: String,
    pub time: String,
    pub remarks: String,
    pub facility: Option<String>,
    pub attendees: Option<i32>,
    pub purpose: Option<String>,
    pub facility_remarks: Option<String>,
    pub student_id: Option<String>,
    pub year_level: Option<String>,
    pub semester: Option<String>,
    pub school_year: Option<String>,
    pub program: Option<String>,
    pub major: Option<String>,
    pub transfer_reason: Option<String>,
    pub requested_docs: Option<Vec<String>>,
    pub claim_release_date: Option<String>,
    pub received_by: Option<String>,
    pub released_by: Option<String>,
    pub position: Option<String>,
    pub salary: Option<String>,
    pub working_days: Option<f64>,
    pub inclusive_dates: Option<String>,
    pub communication: Option<String>,
    pub leave_detail: Option<String>,
    pub custom_leave_type: Option<String>,
    pub leave_duration: Option<String>,
    pub leave_time: Option<String>,
    pub filing_date: Option<String>,
    pub leave_start_date: Option<String>,
    pub leave_end_date: Option<String>,
    pub vacation_leave_earned: Option<String>,
    pub vacation_leave_less: Option<String>,
    pub vacation_leave_balance: Option<String>,
    pub sick_leave_earned: Option<String>,
    pub sick_leave_less: Option<String>,
    pub sick_leave_balance: Option<String>,
    pub hr_recommendation: Option<String>,
    pub approved_for: Option<String>,
    pub disapproved_due_to: Option<String>,
    pub hr_remarks: Option<String>,
    pub updated_by: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestMessage {
    pub id: String,
    pub request_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub body: String,
    pub sent_at: String,
    #[serde(default = "default_message_status")]
    pub status: String,
    #[serde(default)]
    pub read_by: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachment: Option<MessageAttachment>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadMessagePayload {
    pub user_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageAttachment {
    pub data_url: String,
    pub name: String,
    pub size: i32,
    #[serde(rename = "type")]
    pub file_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Announcement {
    pub id: String,
    pub title: String,
    pub body: String,
    pub audience: Option<String>,
    pub author_id: String,
    pub author_name: String,
    pub author_role: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SupplyItem {
    pub id: String,
    pub name: String,
    pub quantity: i32,
    pub unit: String,
    pub min_threshold: i32,
    pub location: String,
    pub category: String,
    pub cost: Option<f64>,
    pub supplier: Option<String>,
    pub expiry_date: Option<String>,
    pub sku: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SupplyCategory {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SupplierInfo {
    pub id: String,
    pub name: String,
    pub contact: String,
    pub email: String,
    pub lead_time: i32,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StockMovement {
    pub id: String,
    pub item_id: String,
    pub item_name: String,
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: i32,
    pub reason: String,
    pub performed_by: String,
    pub date: String,
    pub previous_qty: Option<i32>,
    pub new_qty: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ExitClearanceRequest {
    pub student_name: String,
    pub id_number: String,
    pub program: String,
    pub year_level: String,
    pub acad_year: String,
    pub semester: String,
    pub reason_transfer: String,
    pub requested_docs: Vec<String>,
    pub purpose: String,
}

#[derive(Debug, Serialize)]
pub struct SubmissionResponse {
    pub id: String,
    pub reference_number: String,
    pub tracking_number: String,
    pub status: String,
}
