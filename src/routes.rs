use axum::{Json, extract::State, http::StatusCode};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    Announcement, BootstrapData, ExitClearanceRequest, PortalRequest, RequestMessage, StockMovement,
    SubmissionResponse, SupplierInfo, SupplyCategory, SupplyItem, UserAccount,
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub db_status: String,
}

pub async fn health_check(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "service": "CCD Exit Clearance API",
        "status": "running",
        "database": state.db_status,
    }))
}

pub async fn get_bootstrap_data(
    State(state): State<AppState>,
) -> Result<Json<BootstrapData>, (StatusCode, Json<serde_json::Value>)> {
    let accounts = sqlx::query_as::<_, UserAccount>(
        r#"
        SELECT
            id,
            name,
            email,
            COALESCE(password_hash, '') AS password,
            role,
            department,
            avatar_url
        FROM app_users
        ORDER BY created_at, id
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let requests = sqlx::query_as::<_, PortalRequest>(
        r#"
        SELECT
            id,
            title,
            kind,
            COALESCE(owner_id, '') AS owner_id,
            owner,
            office,
            status,
            request_date::text AS date,
            request_time AS time,
            remarks,
            facility,
            attendees,
            purpose,
            facility_remarks,
            student_id,
            year_level,
            semester,
            school_year,
            program,
            major,
            transfer_reason,
            requested_docs,
            claim_release_date,
            received_by,
            released_by,
            position,
            salary,
            working_days,
            inclusive_dates,
            communication,
            leave_detail,
            filing_date::text AS filing_date,
            leave_start_date::text AS leave_start_date,
            leave_end_date::text AS leave_end_date,
            vacation_leave_earned,
            vacation_leave_less,
            vacation_leave_balance,
            sick_leave_earned,
            sick_leave_less,
            sick_leave_balance,
            hr_recommendation,
            approved_for,
            disapproved_due_to,
            hr_remarks,
            updated_by
        FROM portal_requests
        ORDER BY request_date DESC, created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let messages = sqlx::query_as::<_, RequestMessage>(
        r#"
        SELECT
            id,
            request_id,
            COALESCE(sender_id, '') AS sender_id,
            sender_name,
            body,
            to_char(sent_at, 'Mon DD, HH12:MI AM') AS sent_at
        FROM request_messages
        ORDER BY sent_at
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let inventory = sqlx::query_as::<_, SupplyItem>(
        r#"
        SELECT
            id,
            name,
            quantity,
            unit,
            min_threshold,
            location,
            category,
            cost::float8 AS cost,
            supplier,
            expiry_date::text AS expiry_date,
            sku
        FROM supply_items
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let categories = sqlx::query_as::<_, SupplyCategory>(
        r#"
        SELECT id, name, color
        FROM supply_categories
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let suppliers = sqlx::query_as::<_, SupplierInfo>(
        r#"
        SELECT id, name, contact, email, lead_time
        FROM suppliers
        ORDER BY name
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let stock_movements = sqlx::query_as::<_, StockMovement>(
        r#"
        SELECT
            id,
            item_id,
            item_name,
            movement_type,
            quantity,
            reason,
            performed_by,
            to_char(movement_date, 'YYYY-MM-DD HH24:MI') AS date,
            previous_qty,
            new_qty
        FROM stock_movements
        ORDER BY movement_date DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    let announcements = sqlx::query_as::<_, Announcement>(
        r#"
        SELECT
            id,
            title,
            body,
            audience,
            COALESCE(author_id, '') AS author_id,
            author_name,
            author_role,
            to_char(created_at, 'Mon DD, YYYY, HH12:MI AM') AS created_at
        FROM announcements
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;

    Ok(Json(BootstrapData {
        accounts,
        requests,
        messages,
        announcements,
        inventory,
        categories,
        suppliers,
        stock_movements,
    }))
}

pub async fn sync_bootstrap_data(
    State(state): State<AppState>,
    Json(payload): Json<BootstrapData>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let mut tx = state.db.begin().await.map_err(api_error)?;

    sqlx::query("DELETE FROM request_messages")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM stock_movements")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM announcements")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM portal_requests")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM supply_items")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM suppliers")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM supply_categories")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    sqlx::query("DELETE FROM app_users")
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;

    for account in &payload.accounts {
        sqlx::query(
            r#"
            INSERT INTO app_users (id, name, email, password_hash, role, department, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(&account.id)
        .bind(&account.name)
        .bind(&account.email)
        .bind(&account.password)
        .bind(&account.role)
        .bind(&account.department)
        .bind(&account.avatar_url)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for category in &payload.categories {
        sqlx::query(
            r#"
            INSERT INTO supply_categories (id, name, color)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(&category.id)
        .bind(&category.name)
        .bind(&category.color)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for supplier in &payload.suppliers {
        sqlx::query(
            r#"
            INSERT INTO suppliers (id, name, contact, email, lead_time)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(&supplier.id)
        .bind(&supplier.name)
        .bind(&supplier.contact)
        .bind(&supplier.email)
        .bind(supplier.lead_time)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for item in &payload.inventory {
        sqlx::query(
            r#"
            INSERT INTO supply_items (
                id, name, quantity, unit, min_threshold, location, category, cost, supplier, expiry_date, sku
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, '')::date, $11)
            "#,
        )
        .bind(&item.id)
        .bind(&item.name)
        .bind(item.quantity)
        .bind(&item.unit)
        .bind(item.min_threshold)
        .bind(&item.location)
        .bind(&item.category)
        .bind(item.cost)
        .bind(&item.supplier)
        .bind(item.expiry_date.as_deref().unwrap_or(""))
        .bind(&item.sku)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for request in &payload.requests {
        sqlx::query(
            r#"
            INSERT INTO portal_requests (
                id, title, kind, owner_id, owner, office, status, request_date, request_time, remarks,
                facility, attendees, purpose, facility_remarks, student_id, year_level, semester, school_year,
                program, major, transfer_reason, requested_docs, claim_release_date, received_by, released_by,
                position, salary, working_days, inclusive_dates, communication, leave_detail,
                filing_date, leave_start_date, leave_end_date, vacation_leave_earned, vacation_leave_less,
                vacation_leave_balance, sick_leave_earned, sick_leave_less, sick_leave_balance,
                hr_recommendation, approved_for, disapproved_due_to, hr_remarks, updated_by
            )
            VALUES (
                $1, $2, $3,
                CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $4) THEN $4 ELSE NULL END,
                $5, $6, $7, $8::date, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22::text[], $23, $24, $25, $26, $27, $28, $29, $30,
                $31::date, $32::date, $33::date, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44
            )
            "#,
        )
        .bind(&request.id)
        .bind(&request.title)
        .bind(&request.kind)
        .bind(&request.owner_id)
        .bind(&request.owner)
        .bind(&request.office)
        .bind(&request.status)
        .bind(&request.date)
        .bind(&request.time)
        .bind(&request.remarks)
        .bind(&request.facility)
        .bind(request.attendees)
        .bind(&request.purpose)
        .bind(&request.facility_remarks)
        .bind(&request.student_id)
        .bind(&request.year_level)
        .bind(&request.semester)
        .bind(&request.school_year)
        .bind(&request.program)
        .bind(&request.major)
        .bind(&request.transfer_reason)
        .bind(&request.requested_docs)
        .bind(&request.claim_release_date)
        .bind(&request.received_by)
        .bind(&request.released_by)
        .bind(&request.position)
        .bind(&request.salary)
        .bind(request.working_days)
        .bind(&request.inclusive_dates)
        .bind(&request.communication)
        .bind(&request.leave_detail)
        .bind(&request.filing_date)
        .bind(&request.leave_start_date)
        .bind(&request.leave_end_date)
        .bind(&request.vacation_leave_earned)
        .bind(&request.vacation_leave_less)
        .bind(&request.vacation_leave_balance)
        .bind(&request.sick_leave_earned)
        .bind(&request.sick_leave_less)
        .bind(&request.sick_leave_balance)
        .bind(&request.hr_recommendation)
        .bind(&request.approved_for)
        .bind(&request.disapproved_due_to)
        .bind(&request.hr_remarks)
        .bind(&request.updated_by)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for message in &payload.messages {
        sqlx::query(
            r#"
            INSERT INTO request_messages (id, request_id, sender_id, sender_name, body, sent_at)
            VALUES (
                $1, $2,
                CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $3) THEN $3 ELSE NULL END,
                $4, $5, NOW()
            )
            "#,
        )
        .bind(&message.id)
        .bind(&message.request_id)
        .bind(&message.sender_id)
        .bind(&message.sender_name)
        .bind(&message.body)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for announcement in &payload.announcements {
        sqlx::query(
            r#"
            INSERT INTO announcements (id, title, body, audience, author_id, author_name, author_role, created_at)
            VALUES (
                $1, $2, $3, NULLIF($4, ''),
                CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $5) THEN $5 ELSE NULL END,
                $6, $7, $8::timestamptz
            )
            "#,
        )
        .bind(&announcement.id)
        .bind(&announcement.title)
        .bind(&announcement.body)
        .bind(announcement.audience.as_deref().unwrap_or(""))
        .bind(&announcement.author_id)
        .bind(&announcement.author_name)
        .bind(&announcement.author_role)
        .bind(&announcement.created_at)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    for movement in &payload.stock_movements {
        sqlx::query(
            r#"
            INSERT INTO stock_movements (
                id, item_id, item_name, movement_type, quantity, reason, performed_by,
                movement_date, previous_qty, new_qty
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10)
            "#,
        )
        .bind(&movement.id)
        .bind(&movement.item_id)
        .bind(&movement.item_name)
        .bind(&movement.movement_type)
        .bind(movement.quantity)
        .bind(&movement.reason)
        .bind(&movement.performed_by)
        .bind(&movement.date)
        .bind(movement.previous_qty)
        .bind(movement.new_qty)
        .execute(&mut *tx)
        .await
        .map_err(api_error)?;
    }

    tx.commit().await.map_err(api_error)?;

    Ok(Json(serde_json::json!({ "status": "synced" })))
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
    .execute(&state.db)
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

    Ok(Json(SubmissionResponse {
        id: id.to_string(),
        reference_number,
        tracking_number,
        status: "Pending".to_string(),
    }))
}

fn api_error(error: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({
            "error": "Database operation failed",
            "message": error.to_string()
        })),
    )
}
