use std::{collections::HashSet, sync::Arc};

use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use axum::{
    Json, Router,
    extract::{FromRequestParts, State},
    http::{StatusCode, request},
    response::{self, IntoResponse},
    routing::{get, post},
};
use axum_extra::extract::{CookieJar, cookie::Cookie};
use rand::distr::{Alphanumeric, SampleString};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;

use crate::AppState;

/// Hash of `movie-club`. Default password before change.
const DEFAULT_ADMIN_PASSWORD_HASH: &str =
    "$argon2id$v=19$m=16,t=2,p=1$ekdDOEtGTHBYcGNTZVVlSg$DY1gWRJ9DSAaxJV5DirMLg";
const SESSION_COOKIE_NAME: &str = "SESSIONID";

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_root))
        .route("/schemas", get(get_schemas))
        .route("/login", post(post_login))
}

#[derive(Debug, Error)]
enum AuthApiError {
    #[error("Authentication schema is not enabled")]
    DisabledSchema,
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Invalid payload")]
    InvalidPayload,
    #[error("Internal server error")]
    InternalServerError,
}

impl From<AuthStateError> for AuthApiError {
    fn from(value: AuthStateError) -> Self {
        match value {
            AuthStateError::DisabledSchema => Self::DisabledSchema,
            AuthStateError::HashParseError => Self::InternalServerError,
            AuthStateError::HashingError => Self::InternalServerError,
        }
    }
}

impl IntoResponse for AuthApiError {
    fn into_response(self) -> response::Response {
        let msg = self.to_string();
        let status = match self {
            Self::DisabledSchema => StatusCode::BAD_REQUEST,
            Self::InvalidCredentials => StatusCode::UNAUTHORIZED,
            Self::InvalidPayload => StatusCode::BAD_REQUEST,
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

async fn get_root(ExtractUserSession(user_id): ExtractUserSession) -> impl IntoResponse {
    Json(json!({"user_id": user_id}))
}

async fn get_schemas(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AuthApiError> {
    let auth_state = state
        .auth_state
        .read()
        .map_err(|_| AuthApiError::InternalServerError)?;

    let schemas = &auth_state.schemas;
    let default_password = auth_state
        .password_hash
        .as_ref()
        .is_some_and(|hash| hash == DEFAULT_ADMIN_PASSWORD_HASH);

    Ok(Json(json!({
        "schemas": schemas, "default_password": default_password
    })))
}

#[derive(Debug, Deserialize)]
struct PostLoginPayload {
    schema: AuthSchema,
    password: Option<String>,
}

async fn post_login(
    State(state): State<Arc<AppState>>,
    cookies: CookieJar,
    Json(payload): Json<PostLoginPayload>,
) -> Result<(CookieJar, ()), AuthApiError> {
    let auth_state = state
        .auth_state
        .read()
        .map_err(|_| AuthApiError::InternalServerError)?;

    if !auth_state.schemas().contains(&payload.schema) {
        return Err(AuthApiError::DisabledSchema);
    }

    match payload.schema {
        AuthSchema::Password => {
            let password = payload.password.ok_or(AuthApiError::InvalidPayload)?;
            if !auth_state.verify_password(password)? {
                return Err(AuthApiError::InvalidCredentials);
            }
        }
        _ => unimplemented!(),
    }

    let mut sessions = state
        .sessions
        .write()
        .map_err(|_| AuthApiError::InternalServerError)?;
    let session_id = sessions.new_password_session();

    let mut session_cookie = Cookie::new(SESSION_COOKIE_NAME, session_id);
    session_cookie.set_http_only(true);
    session_cookie.set_path("/api/");
    Ok((cookies.add(session_cookie), ()))
}

#[derive(Debug, Error)]
pub enum AuthStateError {
    #[error("Operation is unsupported while the auth schema is disabled")]
    DisabledSchema,
    #[error("Unable to parse hash")]
    HashParseError,
    // For some reason, `password_hash::errors::Error` doesn't implement `std::error::Error`
    #[error("Error while hashing password")]
    HashingError,
}

// TODO: Refactor AuthState into auth service
#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AuthState {
    schemas: HashSet<AuthSchema>,
    pub password_hash: Option<String>,
}

impl Default for AuthState {
    fn default() -> Self {
        Self {
            schemas: [AuthSchema::Password].into(),
            password_hash: Some(DEFAULT_ADMIN_PASSWORD_HASH.into()),
        }
    }
}

impl AuthState {
    pub fn schemas(&self) -> &HashSet<AuthSchema> {
        &self.schemas
    }

    pub fn set_password(&mut self, password: impl AsRef<[u8]>) -> Result<(), AuthStateError> {
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(password.as_ref(), &salt)
            .map_err(|_| AuthStateError::HashingError)?
            .to_string();
        self.password_hash = Some(hash);
        Ok(())
    }

    pub fn verify_password(&self, password: impl AsRef<[u8]>) -> Result<bool, AuthStateError> {
        let hash_str = self
            .password_hash
            .as_ref()
            .ok_or(AuthStateError::DisabledSchema)?;

        let hash = PasswordHash::new(hash_str).map_err(|_| AuthStateError::HashParseError)?;
        Ok(Argon2::default()
            .verify_password(password.as_ref(), &hash)
            .is_ok())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum AuthSchema {
    /// Password only - only important for admin page
    Password,
    /// Email:password pair
    EmailPassword,
}

// TODO: Add expiration date to session entries
#[derive(Default)]
pub struct Sessions {
    /// Session IDs authenticated via the [AuthSchema::Password] schema.
    password_ids: Vec<String>,
    /// Session IDs authenticated via the [AuthSchema::EmailPassword] schema.
    email_ids: Vec<(String, u32)>,
}

impl Sessions {
    /// Attempts to find the user ID associated with a session ID.
    pub fn get_user_id(&self, session_id: &str) -> Option<u32> {
        if self.password_ids.iter().any(|id| id == session_id) {
            // If authed via password, always default admin user (id = 0)
            Some(0)
        } else if let Some((_, user_id)) = self.email_ids.iter().find(|(id, _)| id == session_id) {
            Some(*user_id)
        } else {
            None
        }
    }

    pub fn new_password_session(&mut self) -> String {
        let mut session_id = Alphanumeric.sample_string(&mut rand::rng(), 32);
        // Avoid duplicates
        while self.get_user_id(&session_id).is_some() {
            session_id = Alphanumeric.sample_string(&mut rand::rng(), 32);
        }
        self.password_ids.push(session_id.clone());
        session_id
    }

    pub fn new_email_session(&mut self, user_id: u32) -> String {
        let mut session_id = Alphanumeric.sample_string(&mut rand::rng(), 32);
        // Avoid duplicates
        while self.get_user_id(&session_id).is_some() {
            session_id = Alphanumeric.sample_string(&mut rand::rng(), 32);
        }
        self.email_ids.push((session_id.clone(), user_id));
        session_id
    }
}

pub struct ExtractOptionalUserSession(pub Option<u32>);
impl<S> FromRequestParts<S> for ExtractOptionalUserSession
where
    S: AsRef<AppState>,
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut request::Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let state = state.as_ref();
        let cookies = CookieJar::from_request_parts(parts, state).await.unwrap();
        let user_id = if let Some(session_cookie) = cookies.get(SESSION_COOKIE_NAME) {
            let sessions = state
                .sessions
                .read()
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            sessions.get_user_id(session_cookie.value())
        } else {
            None
        };
        Ok(Self(user_id))
    }
}

pub struct ExtractUserSession(pub u32);
impl<S> FromRequestParts<S> for ExtractUserSession
where
    S: AsRef<AppState>,
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut request::Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let state = state.as_ref();
        let cookies = CookieJar::from_request_parts(parts, state).await.unwrap();
        let user_id = if let Some(session_cookie) = cookies.get(SESSION_COOKIE_NAME) {
            let sessions = state
                .sessions
                .read()
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            sessions.get_user_id(session_cookie.value())
        } else {
            None
        };

        if let Some(user_id) = user_id {
            Ok(Self(user_id))
        } else {
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}
