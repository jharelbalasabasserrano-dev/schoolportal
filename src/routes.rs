use axum::{Json, extract::State, http::StatusCode};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{ExitClearanceRequest, SubmissionResponse};

#[derive(Clone)]
pub struct AppState {
    pub db: Option<PgPool>,
    pub db_status: String,
}

pub async fn health_check(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "service": "CCD Exit Clearance API",
        "status": "running",
        "database": state.db_status,
    }))
}

pub async fn submit_exit_clearance(
    State(state): State<AppState>,
    Json(payload): Json<ExitClearanceRequest>,
) -> Result<Json<SubmissionResponse>, (StatusCode, Json<serde_json::Value>)> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let reference_number = format!("EXIT-{}-{}", now.format("%Y%m%d"), rand::random::<u16>());
    let tracking_number = format!("TRK-CCD-{}-{}", now.format("%Y%m%d"), rand::random::<u16>());
    let requested_docs = payload.requested_docs.join(", ");

    if let Some(db) = state.db {
        sqlx::query(
            r#"
            INSERT INTO exit_clearance_requests (
                id,
                reference_number,
                tracking_number,
                student_name,
                id_number,
                program,
                year_level,
                acad_year,
                semester,
                reason_transfer,
                requested_docs,
                purpose,
                status
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
            )
            "#,
        )
        .bind(id)
        .bind(&reference_number)
        .bind(&tracking_number)
        .bind(&payload.student_name)
        .bind(&payload.id_number)
        .bind(&payload.program)
        .bind(&payload.year_level)
        .bind(&payload.acad_year)
        .bind(&payload.semester)
        .bind(&payload.reason_transfer)
        .bind(&requested_docs)
        .bind(&payload.purpose)
        .bind("Pending")
        .execute(&db)
        .await
        .map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Submission failed",
                    "message": error.to_string()
                })),
            )
        })?;
    }

    Ok(Json(SubmissionResponse {
        id: id.to_string(),
        reference_number,
        tracking_number,
        status: "Pending".to_string(),
    }))
}
