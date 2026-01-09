use std::{path::PathBuf, sync::Arc};

use anyhow::Context;
use axum::{Json, Router, http::StatusCode, response::IntoResponse};
use log::info;
use serde_json::json;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;

mod api;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Setup tracing with envvar, default to warn
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("backend=warn,tower_http=warn"))
                .unwrap(),
        )
        .init();

    let shared_state = Arc::new(AppState::new());

    // When accessing an unknown route, then fallback to serving the frontend from the dist directory.
    let fallback_service = {
        let index_file = shared_state.frontend_dist_path.join("index.html");
        ServeDir::new(&shared_state.frontend_dist_path)
            .not_found_service(ServeFile::new(index_file))
    };

    let app = Router::new()
        .nest("/api", api::routes())
        .fallback_service(fallback_service)
        .with_state(shared_state)
        .layer(TraceLayer::new_for_http());

    // Get port from environment, default to 3000
    let port = std::env::var("PORT").unwrap_or("3000".into());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .with_context(|| format!("Failed to start TCP listener on port {port}"))?;
    info!("Started server on 0.0.0.0:{port}");
    axum::serve(listener, app).await.unwrap();

    Ok(())
}

struct AppState {
    pub data_path: PathBuf,
    pub frontend_dist_path: PathBuf,
}

impl AppState {
    pub fn new() -> Self {
        let data_path: PathBuf = std::env::var("DATA_FILE_PATH")
            .unwrap_or("../stats.json".into())
            .into();

        let frontend_dist_path: PathBuf = std::env::var("FRONTEND_DIST_DIR")
            .unwrap_or("../dist/".into())
            .into();

        Self {
            data_path,
            frontend_dist_path,
        }
    }
}

struct GenericServerError {
    message: String,
}

impl GenericServerError {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

impl IntoResponse for GenericServerError {
    fn into_response(self) -> axum::response::Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": self.message
            })),
        )
            .into_response()
    }
}
