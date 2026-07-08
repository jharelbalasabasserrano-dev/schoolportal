use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::Utc;
use sqlx::{PgPool, Row, postgres::PgRow};
use std::collections::HashMap;
use uuid::Uuid;

use crate::models::{
    Announcement, BootstrapData, ChangePasswordPayload, ExitClearanceRequest, LoginPayload,
    PortalRequest, ReadMessagePayload, RequestMessage, StockMovement, SubmissionResponse,
    SupplierInfo, SupplyCategory, SupplyItem, UpdateUserAccount, UserAccount,
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

fn public_user(mut account: UserAccount) -> UserAccount {
    account.password.clear();
    account
}

fn hash_password(password: &str) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to hash password",
                    "message": error.to_string()
                })),
            )
        })
}

fn is_argon2_hash(value: &str) -> bool {
    value.starts_with("$argon2")
}

fn hash_password_if_needed(
    password: &str,
) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    if is_argon2_hash(password) {
        Ok(password.to_string())
    } else {
        hash_password(password)
    }
}

fn verify_password(stored: &str, candidate: &str) -> bool {
    if is_argon2_hash(stored) {
        PasswordHash::new(stored)
            .ok()
            .and_then(|parsed| {
                Argon2::default()
                    .verify_password(candidate.as_bytes(), &parsed)
                    .ok()
            })
            .is_some()
    } else {
        stored == candidate
    }
}

fn password_storage_kind(stored: &str) -> &'static str {
    if stored.trim().is_empty() {
        "empty"
    } else if is_argon2_hash(stored) {
        "argon2"
    } else {
        "legacy_plaintext"
    }
}

fn log_auth_event(event: &str, fields: serde_json::Value) {
    eprintln!(
        "{}",
        serde_json::json!({
            "event": event,
            "fields": fields,
        })
    );
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
            '' AS password,
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

    let requests_sql = r#"
        SELECT
            id,
            title,
            kind,
            COALESCE(owner_id, '') AS owner_id,
            owner,
            office,
            status,
            date,
            time,
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
            reference_number,
            received_date::text AS received_date,
            received_time,
            received_by,
            released_by,
            position,
            salary,
            working_days::float8 AS working_days,
            inclusive_dates,
            communication,
            leave_detail,
            leave_vacation_location,
            leave_vacation_specify,
            leave_sick_location,
            leave_sick_illness,
            leave_women_illness,
            leave_study_purpose,
            leave_other_purpose,
            custom_leave_type,
            leave_duration,
            leave_time,
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
            approved_days_with_pay,
            approved_days_without_pay,
            approved_other,
            disapproved_due_to,
            hr_remarks,
            updated_by
        FROM portal_request_details
        ORDER BY date::date DESC, id DESC
        "#;
    let requests = sqlx::query_as::<_, PortalRequest>(requests_sql)
        .fetch_all(&state.db)
        .await
        .map_err(|error| {
            api_query_error(
                "portal_request_details",
                requests_sql,
                serde_json::json!({}),
                error,
            )
        })?;

    let message_rows = sqlx::query(
        r#"
        WITH message_read_agg AS (
            SELECT message_id, array_agg(user_id ORDER BY read_at) AS read_by
            FROM message_reads
            GROUP BY message_id
        ),
        message_attachment_ranked AS (
            SELECT
                message_id,
                storage_path,
                file_name,
                file_size,
                file_type,
                row_number() OVER (PARTITION BY message_id ORDER BY created_at DESC, id DESC) AS rank
            FROM message_attachments
        )
        SELECT
            rm.id,
            rm.request_id,
            COALESCE(rm.sender_id, '') AS sender_id,
            rm.sender_name,
            rm.body,
            rm.sent_at::text AS sent_at,
            CASE
                WHEN cardinality(COALESCE(mra.read_by, rm.read_by, ARRAY[]::TEXT[])) > 0 THEN 'Read'
                ELSE COALESCE(rm.status, 'Delivered')
            END AS status,
            COALESCE(mra.read_by, rm.read_by, ARRAY[]::TEXT[]) AS read_by,
            rm.attachment_data_url,
            COALESCE(mar.storage_path, rm.attachment_storage_path) AS attachment_storage_path,
            COALESCE(mar.file_name, rm.attachment_name) AS attachment_name,
            COALESCE(mar.file_size, rm.attachment_size) AS attachment_size,
            COALESCE(mar.file_type, rm.attachment_type) AS attachment_type
        FROM request_messages rm
        LEFT JOIN message_read_agg mra ON mra.message_id = rm.id
        LEFT JOIN message_attachment_ranked mar ON mar.message_id = rm.id AND mar.rank = 1
        ORDER BY rm.sent_at
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

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> Result<Json<UserAccount>, (StatusCode, Json<serde_json::Value>)> {
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() || payload.password.is_empty() {
        log_auth_event(
            "auth_login_rejected",
            serde_json::json!({
                "reason": "missing_credentials",
                "email_present": !email.is_empty(),
                "password_present": !payload.password.is_empty(),
            }),
        );
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Email and password are required.",
                "code": "missing_credentials"
            })),
        ));
    }

    let sql = r#"
        SELECT
            id,
            name,
            email,
            COALESCE(password_hash, '') AS password,
            role,
            department,
            avatar_url,
            COUNT(*) OVER() AS matched_count
        FROM app_users
        WHERE lower(email) = lower($1)
        ORDER BY
            CASE WHEN email = $1 THEN 0 ELSE 1 END,
            updated_at DESC,
            created_at DESC
        LIMIT 1
        "#;
    let params = serde_json::json!({ "email": email });
    log_db_query("app_users", sql, params.clone());
    let row = sqlx::query(sql)
        .bind(&email)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| api_query_error("app_users", sql, params, error))?;

    let Some(row) = row else {
        log_auth_event(
            "auth_login_rejected",
            serde_json::json!({
                "reason": "user_not_found",
                "email": email,
            }),
        );
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid email or password",
                "code": "invalid_credentials"
            })),
        ));
    };

    let matched_count: i64 = row.get("matched_count");
    let account = UserAccount {
        id: row.get("id"),
        name: row.get("name"),
        email: row.get("email"),
        password: row.get("password"),
        role: row.get("role"),
        department: row.get("department"),
        avatar_url: row.get("avatar_url"),
    };

    if matched_count > 1 {
        log_auth_event(
            "auth_login_email_duplicate",
            serde_json::json!({
                "email": email,
                "matched_count": matched_count,
                "selected_user_id": account.id,
            }),
        );
    }

    if !verify_password(&account.password, &payload.password) {
        log_auth_event(
            "auth_login_rejected",
            serde_json::json!({
                "reason": "password_mismatch",
                "email": email,
                "user_id": account.id,
                "password_storage": password_storage_kind(&account.password),
            }),
        );
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid email or password",
                "code": "invalid_credentials"
            })),
        ));
    }

    if !is_argon2_hash(&account.password) {
        let upgraded_hash = hash_password(&payload.password)?;
        let upgrade_sql =
            "UPDATE app_users SET password_hash = $2, updated_at = NOW() WHERE id = $1";
        log_db_query(
            "app_users",
            upgrade_sql,
            serde_json::json!({ "id": account.id, "password_hash": "[redacted]" }),
        );
        sqlx::query(upgrade_sql)
            .bind(&account.id)
            .bind(upgraded_hash)
            .execute(&state.db)
            .await
            .map_err(|error| {
                api_query_error(
                    "app_users",
                    upgrade_sql,
                    serde_json::json!({ "id": account.id, "password_hash": "[redacted]" }),
                    error,
                )
            })?;
    }

    log_auth_event(
        "auth_login_succeeded",
        serde_json::json!({
            "email": email,
            "user_id": account.id,
            "role": account.role,
            "password_storage": password_storage_kind(&account.password),
        }),
    );

    Ok(Json(public_user(account)))
}

pub async fn change_password(
    State(state): State<AppState>,
    Path(account_id): Path<String>,
    Json(payload): Json<ChangePasswordPayload>,
) -> Result<Json<UserAccount>, (StatusCode, Json<serde_json::Value>)> {
    if payload.new_password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "New password must be at least 8 characters." })),
        ));
    }

    let sql = "SELECT COALESCE(password_hash, '') AS password_hash FROM app_users WHERE id = $1";
    log_db_query("app_users", sql, serde_json::json!({ "id": account_id }));
    let row = sqlx::query(sql)
        .bind(&account_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| {
            api_query_error(
                "app_users",
                sql,
                serde_json::json!({ "id": account_id }),
                error,
            )
        })?;

    let Some(row) = row else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        ));
    };

    let current_hash: String = row.get("password_hash");
    if !verify_password(&current_hash, &payload.current_password) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Current password is incorrect." })),
        ));
    }

    if payload.current_password == payload.new_password {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(
                serde_json::json!({ "error": "New password must be different from the current password." }),
            ),
        ));
    }

    let next_hash = hash_password(&payload.new_password)?;
    let update_sql = "UPDATE app_users SET password_hash = $2, updated_at = NOW() WHERE id = $1";
    log_db_query(
        "app_users",
        update_sql,
        serde_json::json!({ "id": account_id, "password_hash": "[redacted]" }),
    );
    let updated = sqlx::query(update_sql)
        .bind(&account_id)
        .bind(&next_hash)
        .execute(&state.db)
        .await
        .map_err(|error| {
            api_query_error(
                "app_users",
                update_sql,
                serde_json::json!({ "id": account_id, "password_hash": "[redacted]" }),
                error,
            )
        })?;

    if updated.rows_affected() != 1 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        ));
    }

    let verify_sql = r#"
        SELECT
            id,
            name,
            email,
            COALESCE(password_hash, '') AS password,
            role,
            department,
            avatar_url
        FROM app_users
        WHERE id = $1
        "#;
    log_db_query(
        "app_users",
        verify_sql,
        serde_json::json!({ "id": account_id }),
    );
    let saved_account = sqlx::query_as::<_, UserAccount>(verify_sql)
        .bind(&account_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| {
            api_query_error(
                "app_users",
                verify_sql,
                serde_json::json!({ "id": account_id }),
                error,
            )
        })?;

    let Some(saved_account) = saved_account else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        ));
    };

    if !verify_password(&saved_account.password, &payload.new_password)
        || verify_password(&saved_account.password, &payload.current_password)
    {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Password update could not be verified." })),
        ));
    }

    Ok(Json(public_user(saved_account)))
}

pub async fn sync_bootstrap_data(
    State(state): State<AppState>,
    Json(payload): Json<BootstrapData>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let existing_passwords: HashMap<String, String> = sqlx::query_as::<_, (String, String)>(
        "SELECT id, COALESCE(password_hash, '') FROM app_users",
    )
    .fetch_all(&state.db)
    .await
    .map_err(api_error)?
    .into_iter()
    .collect();

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
    let sql = "DELETE FROM request_records";
    log_db_query("request_records", sql, serde_json::json!({}));
    sqlx::query(sql)
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("request_records", sql, serde_json::json!({}), error))?;
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
        let password_to_store = if account.password.trim().is_empty() {
            match existing_passwords.get(&account.id) {
                Some(existing) => existing.clone(),
                None => hash_password(&Uuid::new_v4().to_string())?,
            }
        } else {
            hash_password_if_needed(&account.password)?
        };
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
            .bind(&password_to_store)
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
        let sql = "SELECT upsert_portal_request($1::jsonb)";
        let params = serde_json::to_value(request).unwrap_or_else(|_| {
            serde_json::json!({
                "id": request.id,
                "error": "failed to serialize request parameters"
            })
        });
        log_db_query("request_records", sql, params.clone());
        sqlx::query(sql)
            .bind(params.clone())
            .execute(&mut *tx)
            .await
            .map_err(|error| api_query_error("request_records", sql, params, error))?;
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

        if let Some(file) = attachment.filter(|file| file.storage_path.as_deref().is_some()) {
            let sql = r#"
                INSERT INTO message_attachments (id, message_id, storage_path, file_name, file_size, file_type)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                    storage_path = EXCLUDED.storage_path,
                    file_name = EXCLUDED.file_name,
                    file_size = EXCLUDED.file_size,
                    file_type = EXCLUDED.file_type
                "#;
            let attachment_id = format!("{}-attachment", message.id);
            let params = serde_json::json!({
                "id": attachment_id,
                "message_id": message.id,
                "storage_path": file.storage_path,
                "file_name": file.name,
                "file_size": file.size,
                "file_type": file.file_type,
            });
            log_db_query("message_attachments", sql, params.clone());
            sqlx::query(sql)
                .bind(&attachment_id)
                .bind(&message.id)
                .bind(file.storage_path.as_deref().unwrap_or(""))
                .bind(&file.name)
                .bind(file.size)
                .bind(&file.file_type)
                .execute(&mut *tx)
                .await
                .map_err(|error| api_query_error("message_attachments", sql, params, error))?;
        }

        for reader_id in &message.read_by {
            let sql = r#"
                INSERT INTO message_reads (message_id, user_id)
                SELECT $1, $2
                WHERE EXISTS (SELECT 1 FROM app_users WHERE id = $2)
                ON CONFLICT (message_id, user_id) DO NOTHING
                "#;
            let params = serde_json::json!({
                "message_id": message.id,
                "user_id": reader_id,
            });
            log_db_query("message_reads", sql, params.clone());
            sqlx::query(sql)
                .bind(&message.id)
                .bind(reader_id)
                .execute(&mut *tx)
                .await
                .map_err(|error| api_query_error("message_reads", sql, params, error))?;
        }
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

pub async fn create_account(
    State(state): State<AppState>,
    Json(account): Json<UserAccount>,
) -> Result<Json<UserAccount>, (StatusCode, Json<serde_json::Value>)> {
    if account.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Password must be at least 8 characters." })),
        ));
    }

    let password_hash = hash_password_if_needed(&account.password)?;
    let sql = r#"
        INSERT INTO app_users (id, name, email, password_hash, role, department, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW()
        RETURNING
            id,
            name,
            email,
            '' AS password,
            role,
            department,
            avatar_url
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
    let saved = sqlx::query_as::<_, UserAccount>(sql)
        .bind(&account.id)
        .bind(&account.name)
        .bind(&account.email)
        .bind(password_hash)
        .bind(&account.role)
        .bind(&account.department)
        .bind(&account.avatar_url)
        .fetch_one(&state.db)
        .await
        .map_err(|error| api_query_error("app_users", sql, params, error))?;

    Ok(Json(public_user(saved)))
}

pub async fn update_account(
    State(state): State<AppState>,
    Path(account_id): Path<String>,
    Json(account): Json<UpdateUserAccount>,
) -> Result<Json<UserAccount>, (StatusCode, Json<serde_json::Value>)> {
    let sql = r#"
        UPDATE app_users
        SET
            name = $2,
            email = $3,
            role = $4,
            department = $5,
            avatar_url = $6,
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            id,
            name,
            email,
            '' AS password,
            role,
            department,
            avatar_url
        "#;
    let params = serde_json::json!({
        "id": account_id,
        "name": account.name,
        "email": account.email,
        "role": account.role,
        "department": account.department,
        "avatar_url": account.avatar_url,
    });
    log_db_query("app_users", sql, params.clone());
    let saved = sqlx::query_as::<_, UserAccount>(sql)
        .bind(&account_id)
        .bind(&account.name)
        .bind(&account.email)
        .bind(&account.role)
        .bind(&account.department)
        .bind(&account.avatar_url)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| api_query_error("app_users", sql, params, error))?;

    match saved {
        Some(row) => Ok(Json(row)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        )),
    }
}

pub async fn delete_account(
    State(state): State<AppState>,
    Path(account_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let sql = r#"
        DELETE FROM app_users
        WHERE id = $1 AND role <> 'admin'
        RETURNING id
        "#;
    let params = serde_json::json!({ "id": account_id });
    log_db_query("app_users", sql, params.clone());
    let deleted = sqlx::query(sql)
        .bind(&account_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|error| api_query_error("app_users", sql, params, error))?;

    match deleted {
        Some(_) => Ok(Json(serde_json::json!({ "status": "deleted" }))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        )),
    }
}

pub async fn create_portal_request(
    State(state): State<AppState>,
    Json(request): Json<PortalRequest>,
) -> Result<Json<PortalRequest>, (StatusCode, Json<serde_json::Value>)> {
    let sql = r#"
        WITH saved AS (
            SELECT upsert_portal_request($1::jsonb) AS id
        )
        SELECT
            details.id,
            details.title,
            details.kind,
            details.owner_id,
            details.owner,
            details.office,
            details.status,
            details.date,
            details.time,
            details.remarks,
            details.facility,
            details.attendees,
            details.purpose,
            details.facility_remarks,
            details.student_id,
            details.year_level,
            details.semester,
            details.school_year,
            details.program,
            details.major,
            details.transfer_reason,
            details.requested_docs,
            details.claim_release_date,
            details.reference_number,
            details.received_date,
            details.received_time,
            details.received_by,
            details.released_by,
            details.position,
            details.salary,
            details.working_days,
            details.inclusive_dates,
            details.communication,
            details.leave_detail,
            details.leave_vacation_location,
            details.leave_vacation_specify,
            details.leave_sick_location,
            details.leave_sick_illness,
            details.leave_women_illness,
            details.leave_study_purpose,
            details.leave_other_purpose,
            details.custom_leave_type,
            details.leave_duration,
            details.leave_time,
            details.filing_date,
            details.leave_start_date,
            details.leave_end_date,
            details.vacation_leave_earned,
            details.vacation_leave_less,
            details.vacation_leave_balance,
            details.sick_leave_earned,
            details.sick_leave_less,
            details.sick_leave_balance,
            details.hr_recommendation,
            details.approved_for,
            details.approved_days_with_pay,
            details.approved_days_without_pay,
            details.approved_other,
            details.disapproved_due_to,
            details.hr_remarks,
            details.updated_by
        FROM portal_request_details details
        JOIN saved ON saved.id = details.id
        "#;
    let params = serde_json::to_value(&request).unwrap_or_else(|_| {
        serde_json::json!({
            "id": request.id,
            "error": "failed to serialize request parameters"
        })
    });
    log_db_query("request_records", sql, params.clone());
    let saved = sqlx::query_as::<_, PortalRequest>(sql)
        .bind(params.clone())
        .fetch_one(&state.db)
        .await
        .map_err(|error| api_query_error("request_records", sql, params, error))?;

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

    if inserted.is_some() {
        if let Some(file) = attachment.filter(|file| file.storage_path.as_deref().is_some()) {
            let sql = r#"
                INSERT INTO message_attachments (id, message_id, storage_path, file_name, file_size, file_type)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                    storage_path = EXCLUDED.storage_path,
                    file_name = EXCLUDED.file_name,
                    file_size = EXCLUDED.file_size,
                    file_type = EXCLUDED.file_type
                "#;
            let attachment_id = format!("{}-attachment", message.id);
            let params = serde_json::json!({
                "id": attachment_id,
                "message_id": message.id,
                "storage_path": file.storage_path,
                "file_name": file.name,
                "file_size": file.size,
                "file_type": file.file_type,
            });
            log_db_query("message_attachments", sql, params.clone());
            sqlx::query(sql)
                .bind(&attachment_id)
                .bind(&message.id)
                .bind(file.storage_path.as_deref().unwrap_or(""))
                .bind(&file.name)
                .bind(file.size)
                .bind(&file.file_type)
                .execute(&state.db)
                .await
                .map_err(|error| api_query_error("message_attachments", sql, params, error))?;
        }

        for reader_id in &read_by {
            let sql = r#"
                INSERT INTO message_reads (message_id, user_id)
                SELECT $1, $2
                WHERE EXISTS (SELECT 1 FROM app_users WHERE id = $2)
                ON CONFLICT (message_id, user_id) DO NOTHING
                "#;
            let params = serde_json::json!({
                "message_id": message.id,
                "user_id": reader_id,
            });
            log_db_query("message_reads", sql, params.clone());
            sqlx::query(sql)
                .bind(&message.id)
                .bind(reader_id)
                .execute(&state.db)
                .await
                .map_err(|error| api_query_error("message_reads", sql, params, error))?;
        }
    }

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
    let read_sql = r#"
        INSERT INTO message_reads (message_id, user_id)
        SELECT $1, $2
        WHERE EXISTS (SELECT 1 FROM request_messages WHERE id = $1)
          AND EXISTS (SELECT 1 FROM app_users WHERE id = $2)
        ON CONFLICT (message_id, user_id) DO NOTHING
        "#;
    log_db_query(
        "message_reads",
        read_sql,
        serde_json::json!({ "message_id": message_id, "user_id": payload.user_id }),
    );
    sqlx::query(read_sql)
        .bind(&message_id)
        .bind(&payload.user_id)
        .execute(&state.db)
        .await
        .map_err(|error| {
            api_query_error(
                "message_reads",
                read_sql,
                serde_json::json!({ "message_id": message_id, "user_id": payload.user_id }),
                error,
            )
        })?;

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

pub async fn submit_exit_clearance(
    State(state): State<AppState>,
    Json(payload): Json<ExitClearanceRequest>,
) -> Result<Json<SubmissionResponse>, (StatusCode, Json<serde_json::Value>)> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let request_id = id.to_string();

    let reference_number = format!("EXIT-{}-{}", now.format("%Y%m%d"), rand::random::<u16>());
    let tracking_number = format!("TRK-CCD-{}-{}", now.format("%Y%m%d"), rand::random::<u16>());
    let requested_docs = payload.requested_docs.join(", ");

    let mut tx = state.db.begin().await.map_err(api_error)?;

    let request_payload = serde_json::json!({
        "id": request_id,
        "title": "Exit Clearance",
        "kind": "Exit Clearance",
        "ownerId": payload.id_number,
        "owner": payload.student_name,
        "office": "Registrar",
        "status": "Pending",
        "date": now.format("%Y-%m-%d").to_string(),
        "time": now.format("%H:%M").to_string(),
        "remarks": payload.purpose,
        "studentId": payload.id_number,
        "program": payload.program,
        "yearLevel": payload.year_level,
        "semester": payload.semester,
        "schoolYear": payload.acad_year,
        "transferReason": payload.reason_transfer,
        "requestedDocs": &payload.requested_docs,
        "purpose": payload.purpose,
        "referenceNumber": reference_number,
    });
    let upsert_sql = "SELECT upsert_portal_request($1::jsonb)";
    log_db_query("request_records", upsert_sql, request_payload.clone());
    sqlx::query(upsert_sql)
        .bind(request_payload.clone())
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("request_records", upsert_sql, request_payload, error))?;

    let sql = r#"
        INSERT INTO exit_clearance_requests (
            id,
            request_id,
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
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
        ON CONFLICT (id) DO UPDATE SET
            request_id = EXCLUDED.request_id,
            reference_number = EXCLUDED.reference_number,
            tracking_number = EXCLUDED.tracking_number,
            student_name = EXCLUDED.student_name,
            id_number = EXCLUDED.id_number,
            program = EXCLUDED.program,
            year_level = EXCLUDED.year_level,
            acad_year = EXCLUDED.acad_year,
            semester = EXCLUDED.semester,
            reason_transfer = EXCLUDED.reason_transfer,
            requested_docs = EXCLUDED.requested_docs,
            purpose = EXCLUDED.purpose,
            status = EXCLUDED.status
        "#;
    let params = serde_json::json!({
        "id": id,
        "request_id": request_id,
        "reference_number": reference_number,
        "tracking_number": tracking_number,
        "student_name": payload.student_name,
        "id_number": payload.id_number,
        "program": payload.program,
        "year_level": payload.year_level,
        "acad_year": payload.acad_year,
        "semester": payload.semester,
        "reason_transfer": payload.reason_transfer,
        "requested_docs": requested_docs,
        "purpose": payload.purpose,
        "status": "Pending",
    });
    log_db_query("exit_clearance_requests", sql, params.clone());
    sqlx::query(sql)
        .bind(id)
        .bind(&request_id)
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
        .execute(&mut *tx)
        .await
        .map_err(|error| api_query_error("exit_clearance_requests", sql, params, error))?;

    tx.commit().await.map_err(api_error)?;

    Ok(Json(SubmissionResponse {
        id: request_id,
        reference_number,
        tracking_number,
        status: "Pending".to_string(),
    }))
}

fn api_error(error: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    let details = db_error_details(&error);
    eprintln!(
        "{}",
        serde_json::json!({
            "event": "database_error",
            "message": error.to_string(),
            "details": details,
            "debug": format!("{error:?}"),
        })
    );

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({
            "error": database_error_title(&error),
            "message": error.to_string(),
            "details": details,
        })),
    )
}

fn database_error_title(error: &sqlx::Error) -> &'static str {
    match error {
        sqlx::Error::Database(database_error)
            if matches!(
                database_error.code().as_deref(),
                Some("42703" | "42P01")
            ) =>
        {
            "Database schema mismatch"
        }
        _ => "Database operation failed",
    }
}

fn db_error_details(error: &sqlx::Error) -> serde_json::Value {
    match error {
        sqlx::Error::Database(database_error) => serde_json::json!({
            "code": database_error.code(),
            "table": database_error.table(),
            "constraint": database_error.constraint(),
            "missing_identifier": missing_schema_identifier(database_error.message()),
            "message": database_error.message(),
        }),
        _ => serde_json::json!({}),
    }
}

fn missing_schema_identifier(message: &str) -> Option<String> {
    let quoted = message
        .split('"')
        .nth(1)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string);

    if message.contains("does not exist") {
        quoted
    } else {
        None
    }
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
            "details": db_error_details(&error),
            "debug": format!("{error:?}"),
        })
    );

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({
            "error": database_error_title(&error),
            "table": table,
            "message": error.to_string(),
            "details": db_error_details(&error),
        })),
    )
}
