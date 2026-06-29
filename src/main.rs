mod db;
mod limiter;
mod models;
mod routes;

const EMBEDDED_MIGRATIONS_VERSION: &str = "20260627000000";

use axum::{
    Router,
    middleware::from_fn_with_state,
    routing::{get, patch, post},
};
use limiter::{ConcurrencyLimiter, enforce_concurrency};
use routes::{
    AppState, create_message, create_portal_request, get_bootstrap_data, health_check,
    mark_message_read, submit_exit_clearance, sync_bootstrap_data,
};
use std::{io::ErrorKind, net::SocketAddr, path::PathBuf};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    load_env();

    let state = match build_app_state().await {
        Ok(state) => state,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    };
    let concurrency_limiter = ConcurrencyLimiter::new(20);

    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/exit-clearance", post(submit_exit_clearance))
        .route("/api/requests", post(create_portal_request))
        .route("/api/messages", post(create_message))
        .route("/api/messages/{id}/read", patch(mark_message_read))
        .route(
            "/api/bootstrap",
            get(get_bootstrap_data).put(sync_bootstrap_data),
        )
        .layer(from_fn_with_state(concurrency_limiter, enforce_concurrency))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3002".to_string());
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

fn load_env() {
    dotenvy::dotenv().ok();

    if std::env::var("DATABASE_URL").is_err() {
        let manifest_env = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(".env");
        dotenvy::from_path(manifest_env).ok();
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

async fn build_app_state() -> Result<AppState, String> {
    let db = connect_configured_database().await?;

    Ok(AppState {
        db,
        db_status: "connected".to_string(),
    })
}

async fn connect_configured_database() -> Result<sqlx::PgPool, String> {
    let _ = EMBEDDED_MIGRATIONS_VERSION;
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        "DATABASE_URL not set. Create a .env file using .env.example as a guide.".to_string()
    })?;

    validate_database_url(&database_url)?;
    let database_host = database_url_host(&database_url);

    let pool = db::connect_db(&database_url).await.map_err(|error| {
        format!(
            "Database connection failed for host '{}': {error}\n{}",
            database_host.as_deref().unwrap_or("unknown"),
            connection_help(&database_url, &error.to_string())
        )
    })?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|error| format!("Database migration failed: {error}"))?;

    Ok(pool)
}

fn connection_help(database_url: &str, error: &str) -> &'static str {
    if error.contains("password authentication failed") {
        return "Supabase rejected the database login. Use the database password from Supabase Project Settings > Database, not your Supabase account password. If the password contains symbols, URL-encode it in DATABASE_URL.";
    }

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
        "YOUR_PROJECT_REF",
        "YOUR_DATABASE_PASSWORD",
        "YOUR_REGION",
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

    if database_url.matches('@').count() > 1 {
        return Err(
            "DATABASE_URL contains more than one @ symbol. URL-encode @ in the database password as %40."
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

fn database_url_host(database_url: &str) -> Option<String> {
    let after_at = database_url.rsplit_once('@')?.1;
    let host_with_port = after_at.split('/').next()?;
    let host = host_with_port.split(':').next()?;

    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::{connection_help, database_url_host, validate_database_url};

    #[test]
    fn rejects_placeholder_database_url() {
        let error = validate_database_url(
            "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require",
        )
        .unwrap_err();

        assert!(error.contains("placeholder values"));
    }

    #[test]
    fn rejects_supabase_template_database_url() {
        let error = validate_database_url(
            "postgresql://postgres.YOUR_PROJECT_REF:YOUR_DATABASE_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:6543/postgres?sslmode=require",
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
    fn explains_unencoded_at_symbol_in_database_password() {
        let error = validate_database_url(
            "postgresql://postgres.project:pa@ssword@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require",
        )
        .unwrap_err();

        assert!(error.contains("%40"));
    }

    #[test]
    fn accepts_supabase_url_with_sslmode() {
        validate_database_url(
            "postgresql://postgres:password@db.example.supabase.co:5432/postgres?sslmode=require",
        )
        .unwrap();
    }

    #[test]
    fn extracts_database_host_without_credentials() {
        let host = database_url_host(
            "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
        );

        assert_eq!(
            host.as_deref(),
            Some("aws-0-ap-southeast-1.pooler.supabase.com")
        );
    }

    #[test]
    fn gives_local_database_help_for_localhost_urls() {
        let help = connection_help(
            "postgresql://postgres:password@localhost:5432/ccd_exit_clearance",
            "connection refused",
        );

        assert!(help.contains("Start a local Postgres server"));
    }

    #[test]
    fn gives_authentication_help_for_bad_passwords() {
        let help = connection_help(
            "postgresql://postgres.project:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
            "password authentication failed for user \"postgres\"",
        );

        assert!(help.contains("database password"));
    }
}
