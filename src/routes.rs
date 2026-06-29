use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::{NaiveDate, Utc};
use sqlx::{PgPool, Row, postgres::PgRow};
use uuid::Uuid;

use crate::models::{
    Announcement, BootstrapData, ExitClearanceRequest, PortalRequest, ReadMessagePayload,
    RequestMessage, StockMovement, SubmissionResponse, SupplierInfo, SupplyCategory, SupplyItem,
    UserAccount,
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

fn request_message_from_row(row: PgRow) -> RequestMessage {
    let attachment_storage_path: Option<String> = row.get("attachment_storage_path");
    let attachment_name: Option<String> = row.get("attachment_name");
    let attachment_size: Option<i32> = row.get("attachment_size");
    let attachment_type: Option<String> = row.get("attachment_type");
    let attachment_storage_path =
        attachment_storage_path.filter(|storage_path| !storage_path.trim().is_empty());

    RequestMessage {
        id: row.get("id"),
        request_id: row.get("request_id"),
        sender_id: row.get("sender_id"),
        sender_name: row.get("sender_name"),
        body: row.get("body"),
        sent_at: row.get("sent_at"),
        status: row.get("status"),
        read_by: row.get("read_by"),
        attachment: match (
            attachment_storage_path,
            attachment_name,
            attachment_size,
            attachment_type,
        ) {
            (Some(storage_path), Some(name), Some(size), Some(file_type)) => {
                Some(crate::models::MessageAttachment {
                    data_url: String::new(),
                    name,
                    size,
                    file_type,
                    storage_path: Some(storage_path),
                    access_url: None,
                })
            }
            _ => None,
        },
    }
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

    let message_rows = sqlx::query(
        r#"
        SELECT
            id,
            request_id,
            COALESCE(sender_id, '') AS sender_id,
            sender_name,
            body,
            sent_at::text AS sent_at,
            status,
            read_by,
            attachment_data_url,
            attachment_storage_path,
            attachment_name,
            attachment_size,
            attachment_type
        FROM request_messages
        ORDER BY sent_at
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?;
    let messages = message_rows
        .into_iter()
        .map(request_message_from_row)
        .collect();

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

    let sql = "DELETE FROM request_messages";
    log_db_query("request_messages", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("request_messages", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM stock_movements";
    log_db_query("stock_movements", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("stock_movements", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM announcements";
    log_db_query("announcements", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("announcements", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM portal_requests";
    log_db_query("portal_requests", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("portal_requests", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM supply_items";
    log_db_query("supply_items", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("supply_items", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM suppliers";
    log_db_query("suppliers", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("suppliers", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM supply_categories";
    log_db_query("supply_categories", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("supply_categories", sql, serde_json::json!({}), error))?;
    let sql = "DELETE FROM app_users";
    log_db_query("app_users", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("app_users", sql, serde_json::json!({}), error))?;

    for account in &payload.accounts {
        let sql = r#"
            INSERT INTO app_users (id, name, email, password_hash, role, department, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#;
        let params = serde_json::json!({
            "id": account.id,
            "name": account.name,
            "email": account.email,
            "password_hash": "[redacted]",
            "role": account.role,
            "department": account.department,
            "avatar_url": account.avatar_url,
        });
        log_db_query("app_users", sql, params.clone());
        sqlx::query(sql)
            .bind(&account.id)
            .bind(&account.name)
            .bind(&account.email)
            .bind(&account.password)
            .bind(&account.role)
            .bind(&account.department)
            .bind(&account.avatar_url)
            .execute(&mut *tx)
            .await
            .map_err(|error| api_query_error("app_users", sql, params, error))?;
    }

    for category in &payload.categories {
        let sql = r#"
            INSERT INTO supply_categories (id, name, color)
            VALUES ($1, $2, $3)
            "#;
        let params = serde_json::json!({
            "id": category.id,
            "name": category.name,
            "color": category.color,
        });
        log_db_query("supply_categories", sql, params.clone());
        sqlx::query(sql)
            .bind(&category.id)
            .bind(&category.name)
            .bind(&category.color)
            .execute(&mut *tx)
            .await
            .map_err(|error| api_query_error("supply_categories", sql, params, error))?;
    }

    for supplier in &payload.suppliers {
        let sql = r#"
            INSERT INTO suppliers (id, name, contact, email, lead_time)
            VALUES ($1, $2, $3, $4, $5)
            "#;
        let params = serde_json::json!({
            "id": supplier.id,
            "name": supplier.name,
            "contact": supplier.contact,
            "email": supplier.email,
            "lead_time": supplier.lead_time,
        });
        log_db_query("suppliers", sql, params.clone());
        sqlx::query(sql)
            .bind(&supplier.id)
            .bind(&supplier.name)
            .bind(&supplier.contact)
            .bind(&supplier.email)
            .bind(supplier.lead_time)
            .execute(&mut *tx)
            .await
            .map_err(|error| api_query_error("suppliers", sql, params, error))?;
    }

    for item in &payload.inventory {
        let sql = r#"
            INSERT INTO supply_items (
                id, name, quantity, unit, min_threshold, location, category, cost, supplier, expiry_date, sku
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, '')::date, $11)
            "#;
        let params = serde_json::json!({
            "id": item.id,
            "name": item.name,
            "quantity": item.quantity,
            "unit": item.unit,
            "min_threshold": item.min_threshold,
            "location": item.location,
            "category": item.category,
            "cost": item.cost,
            "supplier": item.supplier,
            "expiry_date": item.expiry_date,
            "sku": item.sku,
        });
        log_db_query("supply_items", sql, params.clone());
        sqlx::query(sql)
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
            .map_err(|error| api_query_error("supply_items", sql, params, error))?;
    }

    for request in &payload.requests {
        let filing_date = parse_optional_date(request.filing_date.as_deref());
        let leave_start_date = parse_optional_date(request.leave_start_date.as_deref());
        let leave_end_date = parse_optional_date(request.leave_end_date.as_deref());
        let sql = r#"
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
                $31, $32, $33,
                $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
            )
            "#;
        let params = serde_json::to_value(request).unwrap_or_else(|_| {
            serde_json::json!({
                "id": request.id,
                "error": "failed to serialize request parameters"
            })
        });
        log_db_query("portal_requests", sql, params.clone());
        sqlx::query(sql)
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
            .bind(filing_date)
            .bind(leave_start_date)
            .bind(leave_end_date)
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
            .map_err(|error| api_query_error("portal_requests", sql, params, error))?;
    }

    for message in &payload.messages {
        let sql = r#"
            INSERT INTO request_messages (
                id, request_id, sender_id, sender_name, body, sent_at,
                attachment_data_url, attachment_storage_path, attachment_name, attachment_size, attachment_type,
                status, read_by
            )
            VALUES (
                $1, $2,
                CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $3) THEN $3 ELSE NULL END,
                $4, $5, COALESCE(NULLIF($6, '')::timestamptz, NOW()), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), $10, NULLIF($11, ''),
                CASE WHEN $12 = 'Read' THEN 'Read' ELSE 'Delivered' END,
                $13
            )
            "#;
        let attachment = message.attachment.as_ref();
        let params = serde_json::json!({
            "id": message.id,
            "request_id": message.request_id,
            "sender_id": message.sender_id,
            "sender_name": message.sender_name,
            "body": message.body,
            "sent_at": message.sent_at,
            "status": message.status,
            "read_by": message.read_by,
            "attachment": attachment.map(|file| serde_json::json!({
                "name": file.name,
                "size": file.size,
                "type": file.file_type,
                "storagePath": file.storage_path,
                "hasDataUrl": !file.data_url.is_empty(),
            })),
        });
        log_db_query("request_messages", sql, params.clone());
        sqlx::query(sql)
            .bind(&message.id)
            .bind(&message.request_id)
            .bind(&message.sender_id)
            .bind(&message.sender_name)
            .bind(&message.body)
            .bind(&message.sent_at)
            .bind("")
            .bind(
                attachment
                    .and_then(|file| file.storage_path.as_deref())
                    .unwrap_or(""),
            )
            .bind(attachment.map(|file| file.name.as_str()).unwrap_or(""))
            .bind(attachment.map(|file| file.size))
            .bind(attachment.map(|file| file.file_type.as_str()).unwrap_or(""))
            .bind(&message.status)
            .bind(&message.read_by)
            .execute(&mut *tx)
            .await
            .map_err(|error| api_query_error("request_messages", sql, params, error))?;
    }

    for announcement in &payload.announcements {
        let sql = r#"
            INSERT INTO announcements (id, title, body, audience, author_id, author_name, author_role, created_at)
            VALUES (
                $1, $2, $3, NULLIF($4, ''),
                CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $5) THEN $5 ELSE NULL END,
                $6, $7, NULLIF($8, '')::timestamptz
            )
            "#;
        let params = serde_json::json!({
            "id": announcement.id,
            "title": announcement.title,
            "body": announcement.body,
            "audience": announcement.audience,
            "author_id": announcement.author_id,
            "author_name": announcement.author_name,
            "author_role": announcement.author_role,
            "created_at": announcement.created_at,
        });
        log_db_query("announcements", sql, params.clone());
        sqlx::query(sql)
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
            .map_err(|error| api_query_error("announcements", sql, params, error))?;
    }

    for movement in &payload.stock_movements {
        let sql = r#"
            INSERT INTO stock_movements (
                id, item_id, item_name, movement_type, quantity, reason, performed_by,
                movement_date, previous_qty, new_qty
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::timestamptz, $9, $10)
            "#;
        let params = serde_json::json!({
            "id": movement.id,
            "item_id": movement.item_id,
            "item_name": movement.item_name,
            "movement_type": movement.movement_type,
            "quantity": movement.quantity,
            "reason": movement.reason,
            "performed_by": movement.performed_by,
            "movement_date": movement.date,
            "previous_qty": movement.previous_qty,
            "new_qty": movement.new_qty,
        });
        log_db_query("stock_movements", sql, params.clone());
        sqlx::query(sql)
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
            .map_err(|error| api_query_error("stock_movements", sql, params, error))?;
    }

    tx.commit().await.map_err(api_error)?;

    Ok(Json(serde_json::json!({ "status": "synced" })))
}

pub async fn create_portal_request(
    State(state): State<AppState>,
    Json(request): Json<PortalRequest>,
) -> Result<Json<PortalRequest>, (StatusCode, Json<serde_json::Value>)> {
    let filing_date = parse_optional_date(request.filing_date.as_deref());
    let leave_start_date = parse_optional_date(request.leave_start_date.as_deref());
    let leave_end_date = parse_optional_date(request.leave_end_date.as_deref());
    let sql = r#"
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
            $31, $32, $33,
            $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            kind = EXCLUDED.kind,
            owner_id = EXCLUDED.owner_id,
            owner = EXCLUDED.owner,
            office = EXCLUDED.office,
            status = EXCLUDED.status,
            request_date = EXCLUDED.request_date,
            request_time = EXCLUDED.request_time,
            remarks = EXCLUDED.remarks,
            facility = EXCLUDED.facility,
            attendees = EXCLUDED.attendees,
            purpose = EXCLUDED.purpose,
            facility_remarks = EXCLUDED.facility_remarks,
            student_id = EXCLUDED.student_id,
            year_level = EXCLUDED.year_level,
            semester = EXCLUDED.semester,
            school_year = EXCLUDED.school_year,
            program = EXCLUDED.program,
            major = EXCLUDED.major,
            transfer_reason = EXCLUDED.transfer_reason,
            requested_docs = EXCLUDED.requested_docs,
            claim_release_date = EXCLUDED.claim_release_date,
            received_by = EXCLUDED.received_by,
            released_by = EXCLUDED.released_by,
            position = EXCLUDED.position,
            salary = EXCLUDED.salary,
            working_days = EXCLUDED.working_days,
            inclusive_dates = EXCLUDED.inclusive_dates,
            communication = EXCLUDED.communication,
            leave_detail = EXCLUDED.leave_detail,
            filing_date = EXCLUDED.filing_date,
            leave_start_date = EXCLUDED.leave_start_date,
            leave_end_date = EXCLUDED.leave_end_date,
            vacation_leave_earned = EXCLUDED.vacation_leave_earned,
            vacation_leave_less = EXCLUDED.vacation_leave_less,
            vacation_leave_balance = EXCLUDED.vacation_leave_balance,
            sick_leave_earned = EXCLUDED.sick_leave_earned,
            sick_leave_less = EXCLUDED.sick_leave_less,
            sick_leave_balance = EXCLUDED.sick_leave_balance,
            hr_recommendation = EXCLUDED.hr_recommendation,
            approved_for = EXCLUDED.approved_for,
            disapproved_due_to = EXCLUDED.disapproved_due_to,
            hr_remarks = EXCLUDED.hr_remarks,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING
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
        "#;
    let params = serde_json::to_value(&request).unwrap_or_else(|_| {
        serde_json::json!({
            "id": request.id,
            "error": "failed to serialize request parameters"
        })
    });
    log_db_query("portal_requests", sql, params.clone());
    let saved = sqlx::query_as::<_, PortalRequest>(sql)
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
        .bind(filing_date)
        .bind(leave_start_date)
        .bind(leave_end_date)
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
        .fetch_one(&state.db)
        .await
        .map_err(|error| api_query_error("portal_requests", sql, params, error))?;

    Ok(Json(saved))
}

pub async fn create_message(
    State(state): State<AppState>,
    Json(message): Json<RequestMessage>,
) -> Result<Json<RequestMessage>, (StatusCode, Json<serde_json::Value>)> {
    let attachment = message.attachment.as_ref();
    let status = if message.status == "Read" {
        "Read"
    } else {
        "Delivered"
    };
    let read_by = if message.read_by.is_empty() {
        vec![message.sender_id.clone()]
    } else {
        message.read_by.clone()
    };
    let sql = r#"
        INSERT INTO request_messages (
            id, request_id, sender_id, sender_name, body, sent_at,
            attachment_data_url, attachment_storage_path, attachment_name, attachment_size, attachment_type,
            status, read_by
        )
        VALUES (
            $1, $2,
            CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = $3) THEN $3 ELSE NULL END,
            $4, $5, COALESCE(NULLIF($6, '')::timestamptz, NOW()),
            NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), $10, NULLIF($11, ''),
            $12, $13
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING
            id,
            request_id,
            COALESCE(sender_id, '') AS sender_id,
            sender_name,
            body,
            sent_at::text AS sent_at,
            status,
            read_by,
            attachment_data_url,
            attachment_storage_path,
            attachment_name,
            attachment_size,
            attachment_type
        "#;
    let params = serde_json::json!({
        "id": message.id,
        "request_id": message.request_id,
        "sender_id": message.sender_id,
        "sender_name": message.sender_name,
        "body": message.body,
        "sent_at": message.sent_at,
        "status": status,
        "read_by": read_by,
        "attachment_storage_path": attachment.and_then(|file| file.storage_path.as_deref()),
    });
    log_db_query("request_messages", sql, params.clone());
    let inserted = sqlx::query(sql)
        .bind(&message.id)
        .bind(&message.request_id)
        .bind(&message.sender_id)
        .bind(&message.sender_name)
        .bind(&message.body)
        .bind(&message.sent_at)
        .bind("")
        .bind(
            attachment
                .and_then(|file| file.storage_path.as_deref())
                .unwrap_or(""),
        )
        .bind(attachment.map(|file| file.name.as_str()).unwrap_or(""))
        .bind(attachment.map(|file| file.size))
        .bind(attachment.map(|file| file.file_type.as_str()).unwrap_or(""))
        .bind(status)
        .bind(&read_by)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| api_query_error("request_messages", sql, params, error))?;

    match inserted {
        Some(row) => Ok(Json(request_message_from_row(row))),
        None => Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({ "error": "Message already exists" })),
        )),
    }
}

pub async fn mark_message_read(
    State(state): State<AppState>,
    Path(message_id): Path<String>,
    Json(payload): Json<ReadMessagePayload>,
) -> Result<Json<RequestMessage>, (StatusCode, Json<serde_json::Value>)> {
    let sql = r#"
        UPDATE request_messages
        SET
            read_by = CASE
                WHEN $2 = ANY(read_by) THEN read_by
                ELSE array_append(read_by, $2)
            END,
            status = 'Read'
        WHERE id = $1
        RETURNING
            id,
            request_id,
            COALESCE(sender_id, '') AS sender_id,
            sender_name,
            body,
            sent_at::text AS sent_at,
            status,
            read_by,
            attachment_data_url,
            attachment_storage_path,
            attachment_name,
            attachment_size,
            attachment_type
        "#;
    let params = serde_json::json!({
        "id": message_id,
        "user_id": payload.user_id,
    });
    log_db_query("request_messages", sql, params.clone());
    let updated = sqlx::query(sql)
        .bind(&message_id)
        .bind(&payload.user_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| api_query_error("request_messages", sql, params, error))?;

    match updated {
        Some(row) => Ok(Json(request_message_from_row(row))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Message not found" })),
        )),
    }
}

fn parse_optional_date(value: Option<&str>) -> Option<NaiveDate> {
    value
        .and_then(|date| {
            let trimmed = date.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        })
        .and_then(|date| NaiveDate::parse_from_str(date, "%Y-%m-%d").ok())
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

fn log_db_query(table: &str, sql: &str, params: serde_json::Value) {
    eprintln!(
        "{}",
        serde_json::json!({
            "event": "database_query",
            "table": table,
            "sql": sql.trim(),
            "params": params,
        })
    );
}

fn api_query_error(
    table: &str,
    sql: &str,
    params: serde_json::Value,
    error: sqlx::Error,
) -> (StatusCode, Json<serde_json::Value>) {
    eprintln!(
        "{}",
        serde_json::json!({
            "event": "database_query_error",
            "table": table,
            "sql": sql.trim(),
            "params": params,
            "message": error.to_string(),
            "debug": format!("{error:?}"),
        })
    );

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({
            "error": "Database operation failed",
            "table": table,
            "message": error.to_string(),
        })),
    )
}
