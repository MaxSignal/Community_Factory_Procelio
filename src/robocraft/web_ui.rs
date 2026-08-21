use actix_web::{get, HttpResponse};

const INDEX: &str = include_str!("../../assets/index.html");
const APP_JS: &str = include_str!("../../assets/app.js");
const FAVICON: &[u8] = include_bytes!("../../assets/favicon.jpg");

#[get("/")]
pub async fn index() -> HttpResponse { HttpResponse::Ok().insert_header(("Content-Type", "text/html; charset=utf-8")).body(INDEX) }

#[get("/app.js")]
pub async fn app_js() -> HttpResponse { HttpResponse::Ok().insert_header(("Content-Type", "application/javascript; charset=utf-8")).body(APP_JS) }

#[get("/favicon.ico")]
pub async fn favicon() -> HttpResponse { HttpResponse::Ok().insert_header(("Content-Type", "image/jpeg")).body(FAVICON) }
