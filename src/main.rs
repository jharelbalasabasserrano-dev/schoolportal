mod db;
mod limiter;
mod models;
mod routes;

use axum::{Router, middleware::from_fn_with_state, routing::get, routing::post};
use limiter::{ConcurrencyLimiter, enforce_concurrency};
use routes::{AppState, health_check, submit_exit_clearance};
use std::{io::ErrorKind, net::SocketAddr};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let state = build_app_state().await;
    let concurrency_limiter = ConcurrencyLimiter::new(20);

    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/exit-clearance", post(submit_exit_clearance))
        .layer(from_fn_with_state(concurrency_limiter, enforce_concurrency))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let address = format!("0.0.0.0:{port}");

    let listener = match bind_server(&address).await {
        Some(listener) => listener,
        None => return,
    };

    println!("Server running on http://localhost:{port}");

    if let Err(error) = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    {
        eprintln!("Server error: {error}");
    }
}

async fn bind_server(address: &str) -> Option<tokio::net::TcpListener> {
    match tokio::net::TcpListener::bind(address).await {
        Ok(listener) => Some(listener),
        Err(error) if error.kind() == ErrorKind::AddrInUse => {
            eprintln!("Backend is already running on {address}.");
            eprintln!(
                "Use the existing server, stop the old ccd-exit-clearance.exe process, or change PORT in .env and update the frontend proxy to match."
            );
            None
        }
        Err(error) => {
            eprintln!("Failed to start server on {address}: {error}");
            None
        }
    }
}

async fn build_app_state() -> AppState {
    match connect_configured_database().await {
        Ok(db) => AppState {
            db: Some(db),
            db_status: "connected".to_string(),
        },
        Err(error) => {
            eprintln!("{error}");
            eprintln!("Starting without Postgres. Submissions will be accepted but not persisted.");

            AppState {
                db: None,
                db_status: "memory only".to_string(),
            }
        }
    }
}

async fn connect_configured_database() -> Result<sqlx::PgPool, String> {
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        "DATABASE_URL not set. Create a .env file using .env.example as a guide.".to_string()
    })?;

    validate_database_url(&database_url)?;

    let pool = db::connect_db(&database_url).await.map_err(|error| {
        format!(
            "Database connection failed: {error}\n{}",
            connection_help(&database_url)
        )
    })?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|error| format!("Database migration failed: {error}"))?;

    Ok(pool)
}

fn connection_help(database_url: &str) -> &'static str {
    if database_url.contains("localhost") || database_url.contains("127.0.0.1") {
        "Start a local Postgres server that matches DATABASE_URL, or replace DATABASE_URL with your real Supabase connection string."
    } else {
        "Check DATABASE_URL in .env. For Supabase, use a Postgres connection string with sslmode=require."
    }
}

fn validate_database_url(database_url: &str) -> Result<(), String> {
    let placeholder_patterns = [
        "[PROJECT-REF]",
        "[YOUR-PASSWORD]",
        "[REGION]",
        "<PROJECT_REF>",
        "<YOUR-PASSWORD>",
        "<DB_PASSWORD>",
        "<REGION>",
    ];

    if placeholder_patterns
        .iter()
        .any(|placeholder| database_url.contains(placeholder))
    {
        return Err(
            "DATABASE_URL still contains placeholder values. Paste your real Supabase connection string into .env."
                .to_string(),
        );
    }

    if database_url.contains('[') || database_url.contains(']') {
        return Err(
            "DATABASE_URL contains square brackets. If these are placeholder markers, replace them with real values. If they are part of your password, URL-encode them as %5B and %5D."
                .to_string(),
        );
    }

    if database_url.contains('<') || database_url.contains('>') {
        return Err(
            "DATABASE_URL contains angle brackets. Replace placeholder markers with real values, without the brackets."
                .to_string(),
        );
    }

    if (database_url.contains(".supabase.co") || database_url.contains(".pooler.supabase.com"))
        && !database_url.contains("sslmode=require")
    {
        return Err(
            "Supabase connection strings require sslmode=require. Use the connection string exactly as provided by the Supabase dashboard."
                .to_string(),
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{connection_help, validate_database_url};

    #[test]
    fn rejects_placeholder_database_url() {
        let error = validate_database_url(
            "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require",
        )
        .unwrap_err();

        assert!(error.contains("placeholder values"));
    }

    #[test]
    fn explains_square_brackets_in_database_url() {
        let error = validate_database_url(
            "postgresql://postgres:pa[ss]word@db.example.supabase.co:5432/postgres?sslmode=require",
        )
        .unwrap_err();

        assert!(error.contains("URL-encode"));
    }

    #[test]
    fn rejects_supabase_url_without_sslmode() {
        let error = validate_database_url(
            "postgresql://postgres:password@db.example.supabase.co:5432/postgres",
        )
        .unwrap_err();

        assert!(error.contains("sslmode=require"));
    }

    #[test]
    fn accepts_supabase_url_with_sslmode() {
        validate_database_url(
            "postgresql://postgres:password@db.example.supabase.co:5432/postgres?sslmode=require",
        )
        .unwrap();
    }

    #[test]
    fn gives_local_database_help_for_localhost_urls() {
        let help =
            connection_help("postgresql://postgres:password@localhost:5432/ccd_exit_clearance");

        assert!(help.contains("Start a local Postgres server"));
    }
}
