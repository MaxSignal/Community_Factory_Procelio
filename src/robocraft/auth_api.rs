use actix_web::{cookie::{Cookie, SameSite}, get, post, web::{Data, Json}, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use super::app::AppState;

#[derive(Deserialize)]
pub struct Credentials { pub username: String, pub password: String }
#[derive(Serialize)]
pub struct Me { pub logged_in: bool, pub username: Option<String>, pub admin: bool }

fn auth_cookie(token: &str) -> Cookie<'static> {
    Cookie::build("rcf_session", token.to_string())
        .http_only(true).same_site(SameSite::Lax).path("/").finish()
}
fn token(req: &HttpRequest) -> Option<String> { req.cookie("rcf_session").map(|c| c.value().to_string()) }
pub fn current_user(state: &AppState, req: &HttpRequest) -> Option<String> { token(req).and_then(|t| state.username_for_token(&t)) }
pub fn current_auth(state: &AppState, req: &HttpRequest) -> Option<(String, bool)> { token(req).and_then(|t| state.auth_for_token(&t)) }

#[post("/api/auth/register")]
pub async fn register(state: Data<AppState>, body: Json<Credentials>) -> HttpResponse {
    match state.storage.register(&body.username, &body.password) {
        Ok(()) => HttpResponse::Ok().finish(),
        Err(e) => HttpResponse::BadRequest().body(e.to_string()),
    }
}

#[post("/api/auth/login")]
pub async fn login(state: Data<AppState>, body: Json<Credentials>) -> HttpResponse {
    match state.storage.authenticate(&body.username, &body.password) {
        Ok(Some((username, admin))) => {
            let token = state.new_session(username.clone(), admin);
            HttpResponse::Ok().cookie(auth_cookie(&token)).json(Me { logged_in: true, username: Some(username), admin })
        }
        Ok(None) => HttpResponse::Unauthorized().body("Invalid username or password."),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[post("/api/auth/logout")]
pub async fn logout(state: Data<AppState>, req: HttpRequest) -> HttpResponse {
    if let Some(t) = token(&req) { state.remove_session(&t); }
    let clear = Cookie::build("rcf_session", "").http_only(true).same_site(SameSite::Lax).path("/").max_age(actix_web::cookie::time::Duration::seconds(0)).finish();
    HttpResponse::Ok().cookie(clear).finish()
}

#[get("/api/auth/me")]
pub async fn me(state: Data<AppState>, req: HttpRequest) -> HttpResponse {
    let auth = current_auth(&state, &req);
    HttpResponse::Ok().json(Me { logged_in: auth.is_some(), username: auth.as_ref().map(|(u, _)| u.clone()), admin: auth.map(|(_, a)| a).unwrap_or(false) })
}
