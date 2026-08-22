use actix_web::{delete, get, post, web::{Data, Json, Path}, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use super::{app::AppState, auth_api::current_auth};

#[derive(Debug, Deserialize)]
pub struct CreateReportRequest {
    pub message: String,
    #[serde(default)]
    pub contact: String,
}

#[derive(Debug, Serialize)]
pub struct ReportsResponse {
    pub reports: Vec<super::app::Report>,
}

#[post("/api/reports")]
pub async fn create(state: Data<AppState>, req: HttpRequest, body: Json<CreateReportRequest>) -> HttpResponse {
    let username = current_auth(&state, &req).map(|(u, _)| u);
    match state.storage.add_report(&body.message, &body.contact, username) {
        Ok(report) => HttpResponse::Created().json(report),
        Err(super::app::AppError::Invalid(message)) => HttpResponse::BadRequest().body(message),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/reports")]
pub async fn list(state: Data<AppState>, req: HttpRequest) -> HttpResponse {
    let Some((_, admin)) = current_auth(&state, &req) else { return HttpResponse::Unauthorized().finish(); };
    if !admin { return HttpResponse::Forbidden().finish(); }
    match state.storage.reports() {
        Ok(mut reports) => {
            reports.sort_by(|a,b| b.created_at.cmp(&a.created_at));
            HttpResponse::Ok().json(ReportsResponse { reports })
        },
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[delete("/api/reports/{id}")]
pub async fn delete(state: Data<AppState>, req: HttpRequest, id: Path<String>) -> HttpResponse {
    let Some((_, admin)) = current_auth(&state, &req) else { return HttpResponse::Unauthorized().finish(); };
    if !admin { return HttpResponse::Forbidden().finish(); }
    match state.storage.delete_report(&id) {
        Ok(true) => HttpResponse::NoContent().finish(),
        Ok(false) => HttpResponse::NotFound().finish(),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
