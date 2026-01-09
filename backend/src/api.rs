use std::sync::Arc;

use axum::{Router, extract::State, routing::get};

use crate::{AppState, GenericServerError};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/data", get(get_data))
}

async fn get_data(State(state): State<Arc<AppState>>) -> Result<Vec<u8>, GenericServerError> {
    tokio::fs::read(&state.data_path)
        .await
        .map_err(|_| GenericServerError::new("Failed to read data file".into()))
}
