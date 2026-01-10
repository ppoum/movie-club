use std::sync::Arc;

use axum::{Json, Router, extract::State, http::StatusCode, response::IntoResponse, routing::get};
use serde_json::json;

use crate::AppState;

pub mod admin;
pub mod auth;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/data", get(get_data))
        .nest("/admin", admin::routes())
        .nest("/auth", auth::routes())
        .fallback(api_fallback)
}

async fn get_data(State(state): State<Arc<AppState>>) -> Result<Vec<u8>, impl IntoResponse> {
    tokio::fs::read(&state.data_path).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to read data file"})),
        )
    })
}

async fn api_fallback() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(json!({"message": "API endpoint not found"})),
    )
}
