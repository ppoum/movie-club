use std::{
    path::PathBuf,
    sync::{Arc, RwLock},
};

use anyhow::Context;
use axum::Router;
use log::info;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::EnvFilter;

use crate::{
    api::auth::{AuthState, Sessions},
    repository::{StateRepository, StateRepositoryError},
    services::records::RecordsState,
};

mod api;
mod repository;
mod services;

const FRONTEND_DIST_DIR: &str = env!("FRONTEND_DIST_DIR");

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

    let shared_state = Arc::new(AppState::new()?);

    // When accessing an unknown route, then fallback to serving the frontend from the dist directory.
    let fallback_service = {
        let index_file = shared_state.frontend_dist_path.join("index.html");
        ServeDir::new(&shared_state.frontend_dist_path)
            .not_found_service(ServeFile::new(index_file))
    };

    let app = Router::new()
        .nest("/api", api::routes())
        .fallback_service(fallback_service)
        .layer(TraceLayer::new_for_http())
        .with_state(shared_state);

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
    // TODO: Do we actually need these paths in the state?
    pub data_path: PathBuf,
    pub frontend_dist_path: PathBuf,

    pub sessions: Arc<RwLock<Sessions>>,
    pub auth_state: Arc<RwLock<StateRepository<AuthState>>>,
    pub records_state: Arc<RwLock<StateRepository<RecordsState>>>,
}

impl AppState {
    pub fn new() -> anyhow::Result<Self> {
        let data_path: PathBuf = std::env::var("DATA_FILE_PATH")
            .unwrap_or("../stats.json".into())
            .into();

        let frontend_dist_path: PathBuf = std::env::var("FRONTEND_DIST_DIR_OVERRIDE")
            .unwrap_or(FRONTEND_DIST_DIR.into())
            .into();

        let state_dir: PathBuf = std::env::var("STATE_DIRECTORY")
            .unwrap_or("./state/".into())
            .into();

        let auth_state = {
            let file_path = state_dir.join("auth.json");

            let repo = match StateRepository::try_from_file(file_path) {
                Ok(r) => r,
                Err(StateRepositoryError::FileNotFound(p)) => {
                    log::warn!(
                        "Auth state at {p:?} does not exist, attempting to create default file"
                    );
                    StateRepository::new_save_default(p)
                        .context("Failed to create default auth state file")?
                }
                Err(e) => return Err(e).context("Unable to load auth state file"),
            };
            Arc::new(RwLock::new(repo))
        };

        let records_state = {
            let file_path = state_dir.join("records.json");
            let repo = match StateRepository::try_from_file(file_path.clone()) {
                Ok(r) => r,
                Err(StateRepositoryError::FileNotFound(p)) => {
                    log::warn!(
                        "Records state at {p:?} does not exist, attempting to create default file"
                    );
                    StateRepository::new_save_default(p)
                        .context("Failed to create default records state file")?
                }
                Err(e) => return Err(e).context("Unable to load records state file"),
            };
            Arc::new(RwLock::new(repo))
        };

        Ok(Self {
            data_path,
            frontend_dist_path,
            sessions: Arc::new(RwLock::new(Sessions::default())),
            auth_state,
            records_state,
        })
    }
}
