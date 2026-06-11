use serde::{Deserialize, Serialize};

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
