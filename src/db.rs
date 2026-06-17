use std::{str::FromStr, time::Duration};

use sqlx::{
    PgPool,
    postgres::{PgConnectOptions, PgPoolOptions},
};

pub async fn connect_db(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let connect_options = connect_options(database_url)?;

    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(15))
        .connect_with(connect_options)
        .await
}

fn connect_options(database_url: &str) -> Result<PgConnectOptions, sqlx::Error> {
    let mut options = PgConnectOptions::from_str(database_url)?;

    if uses_supabase_transaction_pooler(database_url) {
        options = options.statement_cache_capacity(0);
    }

    Ok(options)
}

fn uses_supabase_transaction_pooler(database_url: &str) -> bool {
    database_url.contains(".pooler.supabase.com") && database_url.contains(":6543/")
}

#[cfg(test)]
mod tests {
    use super::uses_supabase_transaction_pooler;

    #[test]
    fn detects_supabase_transaction_pooler_urls() {
        assert!(uses_supabase_transaction_pooler(
            "postgresql://postgres.project:password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
        ));
    }

    #[test]
    fn leaves_direct_supabase_urls_unchanged() {
        assert!(!uses_supabase_transaction_pooler(
            "postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require"
        ));
    }

    #[test]
    fn leaves_supabase_session_pooler_urls_unchanged() {
        assert!(!uses_supabase_transaction_pooler(
            "postgresql://postgres.project:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
        ));
    }
}
