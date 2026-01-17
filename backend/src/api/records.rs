use std::sync::Arc;

use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, put},
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::json;
use thiserror::Error;

use crate::{
    AppState,
    api::auth::ExtractUserSession,
    repository::StateRepositoryError,
    services::records::{RecordsStateError, SlimRecommendationRecord},
};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/recommendations", get(get_recommendations))
        .route("/recommendations", put(put_recommendations))
        .route("/recommendations", delete(delete_recommendations))
}

#[derive(Debug, Error)]
enum RecordsApiError {
    #[error(transparent)]
    StateError(#[from] RecordsStateError),
    #[error("Internal server error")]
    InternalServerError,
}
impl From<StateRepositoryError> for RecordsApiError {
    fn from(_: StateRepositoryError) -> Self {
        Self::InternalServerError
    }
}

impl IntoResponse for RecordsApiError {
    fn into_response(self) -> axum::response::Response {
        let msg = self.to_string();
        let status = match self {
            Self::StateError(RecordsStateError::MissingField(_, _)) => StatusCode::BAD_REQUEST,
            Self::StateError(RecordsStateError::NotFound(_)) => StatusCode::NOT_FOUND,
            Self::StateError(RecordsStateError::ValidationError(_, _)) => StatusCode::BAD_REQUEST,
            Self::InternalServerError => StatusCode::INTERNAL_SERVER_ERROR,
        };

        (
            status,
            Json(json!({
                "error": msg
            })),
        )
            .into_response()
    }
}

async fn get_recommendations(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, RecordsApiError> {
    let state = state
        .records_state
        .read()
        .map_err(|_| RecordsApiError::InternalServerError)?;

    Ok(Json(state.recommendations().to_owned()))
}

#[derive(Debug, Deserialize)]
struct PutRecommendationsPayload {
    recommendations: Vec<SlimRecommendationRecord>,
}
async fn put_recommendations(
    ExtractUserSession(_): ExtractUserSession,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PutRecommendationsPayload>,
) -> Result<impl IntoResponse, RecordsApiError> {
    let mut state = state
        .records_state
        .write()
        .map_err(|_| RecordsApiError::InternalServerError)?;

    state.try_add_recommendations(payload.recommendations)?;
    state.try_save_file()?;

    Ok(())
}

#[derive(Debug, Deserialize)]
struct DeleteRecommendationsPayload {
    recommendations: Vec<NaiveDate>,
}
async fn delete_recommendations(
    ExtractUserSession(_): ExtractUserSession,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DeleteRecommendationsPayload>,
) -> Result<impl IntoResponse, RecordsApiError> {
    let mut state = state
        .records_state
        .write()
        .map_err(|_| RecordsApiError::InternalServerError)?;

    state.try_remove_recommendations(payload.recommendations)?;
    state.try_save_file()?;

    Ok(())
}
