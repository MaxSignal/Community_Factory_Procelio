use actix_web::{get, HttpRequest, HttpResponse};

const INDEX: &str = include_str!("../../assets/index.html");
const APP_JS: &str = include_str!("../../assets/app.js");
const I18N_JS: &str = include_str!("../../assets/i18n.js");
const FAVICON: &[u8] = include_bytes!("../../assets/favicon.jpg");

fn initial_language(req: &HttpRequest) -> &'static str {
    // Prefer country headers supplied by the reverse proxy/CDN already in front
    // of the application. No external GeoIP service is contacted.
    for name in [
        "CF-IPCountry",
        "CloudFront-Viewer-Country",
        "X-Country-Code",
        "X-Vercel-IP-Country",
        "X-AppEngine-Country",
    ] {
        if let Some(value) = req.headers().get(name).and_then(|v| v.to_str().ok()) {
            if value.eq_ignore_ascii_case("JP") {
                return "ja";
            }
            if value.len() == 2 {
                return "en";
            }
        }
    }

    // Direct access fallback: use the browser's language preference.
    if let Some(value) = req.headers().get("Accept-Language").and_then(|v| v.to_str().ok()) {
        if value.to_ascii_lowercase().starts_with("ja") || value.to_ascii_lowercase().contains(",ja") {
            return "ja";
        }
    }
    "en"
}

#[get("/")]
pub async fn index(req: HttpRequest) -> HttpResponse {
    let lang = initial_language(&req);
    let marker = r#"<meta name="initial-language" content="en">"#;
    let html = INDEX.replace(marker, &format!(r#"<meta name="initial-language" content="{}">"#, lang));
    HttpResponse::Ok()
        .insert_header(("Content-Type", "text/html; charset=utf-8"))
        .body(html)
}

#[get("/app.js")]
pub async fn app_js() -> HttpResponse {
    HttpResponse::Ok().insert_header(("Content-Type", "application/javascript; charset=utf-8")).body(APP_JS)
}

#[get("/i18n.js")]
pub async fn i18n_js() -> HttpResponse {
    HttpResponse::Ok().insert_header(("Content-Type", "application/javascript; charset=utf-8")).body(I18N_JS)
}

#[get("/favicon.ico")]
pub async fn favicon() -> HttpResponse {
    HttpResponse::Ok().insert_header(("Content-Type", "image/jpeg")).body(FAVICON)
}
