use axum::{
    extract::{ConnectInfo, State},
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{Arc, Mutex},
};
use tokio::sync::Semaphore;

#[derive(Clone)]
pub struct ConcurrencyLimiter {
    inner: Arc<Mutex<HashMap<IpAddr, Arc<Semaphore>>>>,
    max_per_ip: usize,
}

impl ConcurrencyLimiter {
    pub fn new(max_per_ip: usize) -> Self {
        Self {
            inner: Arc::new(Mutex::new(HashMap::new())),
            max_per_ip,
        }
    }

    fn get_semaphore(&self, ip: IpAddr) -> Arc<Semaphore> {
        let mut semaphores = self.inner.lock().expect("limiter mutex poisoned");

        semaphores
            .entry(ip)
            .or_insert_with(|| Arc::new(Semaphore::new(self.max_per_ip)))
            .clone()
    }
}

pub async fn enforce_concurrency(
    State(limiter): State<ConcurrencyLimiter>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let ip = req
        .extensions()
        .get::<ConnectInfo<std::net::SocketAddr>>()
        .map(|ci| ci.0.ip());

    if let Some(ip) = ip {
        let semaphore = limiter.get_semaphore(ip);
        match semaphore.try_acquire() {
            Ok(permit) => {
                let res = next.run(req).await;
                drop(permit);
                Ok(res)
            }
            Err(_) => Err(StatusCode::TOO_MANY_REQUESTS),
        }
    } else {
        Ok(next.run(req).await)
    }
}
