use actix_multipart::Multipart;
use actix_web::{delete, get, post, web::{Data, Path}, HttpRequest, HttpResponse};
use futures_util::StreamExt;
use image::{codecs::jpeg::JpegEncoder, GenericImageView, ImageReader};
use serde::Serialize;
use std::io::Cursor;
use uuid::Uuid;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use md5::{Digest, Md5};
use crate::robocraft::{app::{now, public_robot, AppError, AppState, Robot, PREVIEW_MAX_BYTES, THUMB_MAX_BYTES, THUMB_RATIO}, auth_api::{current_auth, current_user}};

#[derive(Serialize)]
struct ListResponse { robots: Vec<super::super::app::PublicRobot> }

#[get("/api/robots")]
pub async fn list(state: Data<AppState>) -> HttpResponse {
    match state.storage.robots() {
        Ok(mut robots) => { robots.sort_by_key(|r| std::cmp::Reverse(r.created_at)); HttpResponse::Ok().json(ListResponse { robots: robots.into_iter().map(public_robot).collect() }) }
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/robots/{id}")]
pub async fn get(state: Data<AppState>, id: Path<String>) -> HttpResponse {
    match state.storage.robot(&id) {
        Ok(Some(robot)) => HttpResponse::Ok().json(public_robot(robot)),
        Ok(None) => HttpResponse::NotFound().finish(),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

async fn read_field(mut field: actix_multipart::Field) -> Result<Vec<u8>, AppError> {
    let mut out = Vec::new();
    while let Some(chunk) = field.next().await { out.extend_from_slice(&chunk.map_err(|e| AppError::Invalid(e.to_string()))?); }
    Ok(out)
}



struct BotFileInfo {
    name: String,
    footer: Vec<u8>,
}

fn validate_bot_file(bytes: &[u8]) -> Result<BotFileInfo, AppError> {
    const HEADER_LEN: usize = 8;
    const NAME_LEN_OFFSET: usize = 0x10;
    const RECORD_SIZE: usize = 13;
    const FOOTER_LEN: usize = 16;
    // The area after the block records is not a fixed-size zero trailer.
    // Different valid .bot files may contain additional data before the MD5 footer.
    if bytes.len() < NAME_LEN_OFFSET + 1 + 4 + FOOTER_LEN {
        return Err(AppError::Invalid("Bot file is too small.".into()));
    }
    if &bytes[0..4] != [0xC5, 0x71, 0xB0, 0x40] {
        return Err(AppError::Invalid("Invalid bot file header.".into()));
    }

    let name_len = bytes[NAME_LEN_OFFSET] as usize;
    let name_start = NAME_LEN_OFFSET + 1;
    let count_pos = name_start.checked_add(name_len)
        .ok_or_else(|| AppError::Invalid("Invalid bot name length.".into()))?;
    if count_pos + 4 > bytes.len() {
        return Err(AppError::Invalid("Invalid bot name section.".into()));
    }

    let name = std::str::from_utf8(&bytes[name_start..count_pos])
        .map_err(|_| AppError::Invalid("Bot name is not valid UTF-8.".into()))?
        .to_string();
    let block_count = u32::from_be_bytes(bytes[count_pos..count_pos + 4].try_into().unwrap()) as usize;
    let records_start = count_pos + 4;
    let records_len = block_count.checked_mul(RECORD_SIZE)
        .ok_or_else(|| AppError::Invalid("Invalid block count.".into()))?;
    let trailer_start = records_start.checked_add(records_len)
        .ok_or_else(|| AppError::Invalid("Invalid block data length.".into()))?;
    let footer_start = bytes.len().checked_sub(FOOTER_LEN)
        .ok_or_else(|| AppError::Invalid("Invalid bot footer.".into()))?;

    // The records must fit before the footer, but the bytes between the records
    // and the footer are format-specific and must be preserved rather than
    // interpreted as a fixed zero trailer.
    if trailer_start > footer_start {
        return Err(AppError::Invalid("Block data extends beyond the MD5 footer.".into()));
    }

    let footer = bytes[footer_start..].to_vec();
    let mut hasher = Md5::new();
    hasher.update(&bytes[HEADER_LEN..footer_start]);
    let calculated = hasher.finalize();
    if footer.as_slice() != calculated.as_slice() {
        return Err(AppError::Invalid("Bot file checksum (MD5) is invalid.".into()));
    }

    Ok(BotFileInfo { name, footer })
}

fn make_image_jpeg(bytes: &[u8], max_bytes: usize, max_dimension: u32) -> Result<Vec<u8>, AppError> {
    let reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format().map_err(|e| AppError::Image(e.to_string()))?;
    let img = reader.decode().map_err(|e| AppError::Image(e.to_string()))?;
    let mut quality: u8 = 88;
    let mut working = img;
    loop {
        if working.width() > max_dimension || working.height() > max_dimension {
            working = working.resize(max_dimension, max_dimension, image::imageops::FilterType::Lanczos3);
        }
        let mut buf = Vec::new();
        JpegEncoder::new_with_quality(&mut buf, quality).encode_image(&working).map_err(|e| AppError::Image(e.to_string()))?;
        if buf.len() <= max_bytes { return Ok(buf); }
        if quality > 50 {
            quality -= 8;
        } else {
            let nw = (working.width() as f32 * 0.85).max(320.0) as u32;
            let nh = (working.height() as f32 * 0.85).max(240.0) as u32;
            if nw == working.width() || nh == working.height() { return Err(AppError::Invalid("Could not reduce the image to the required size.".into())); }
            working = working.resize(nw, nh, image::imageops::FilterType::Lanczos3);
        }
    }
}

fn make_thumbnail(bytes: &[u8]) -> Result<Vec<u8>, AppError> {
    let reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format().map_err(|e| AppError::Image(e.to_string()))?;
    let img = reader.decode().map_err(|e| AppError::Image(e.to_string()))?;
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 { return Err(AppError::Invalid("Invalid thumbnail image.".into())); }
    let current = w as f64 / h as f64;
    if (current - THUMB_RATIO).abs() > 0.025 { return Err(AppError::Invalid("Thumbnail must use the required aspect ratio.".into())); }

    let mut quality: u8 = 88;
    let mut working = img;
    loop {
        let max_dim = if quality >= 60 { 1400 } else { 1100 };
        if working.width() > max_dim || working.height() > max_dim {
            working = working.resize(max_dim, max_dim, image::imageops::FilterType::Lanczos3);
        }
        let mut buf = Vec::new();
        JpegEncoder::new_with_quality(&mut buf, quality).encode_image(&working).map_err(|e| AppError::Image(e.to_string()))?;
        if buf.len() <= THUMB_MAX_BYTES { return Ok(buf); }
        if quality > 50 { quality -= 8; } else {
            let nw = (working.width() as f32 * 0.85).max(320.0) as u32;
            let nh = (working.height() as f32 * 0.85).max(184.0) as u32;
            if nw == working.width() || nh == working.height() { return Err(AppError::Invalid("Could not reduce the thumbnail to 1 MB or less.".into())); }
            working = working.resize(nw, nh, image::imageops::FilterType::Lanczos3);
        }
    }
}

#[post("/api/robots")]
pub async fn upload(state: Data<AppState>, req: HttpRequest, mut payload: Multipart) -> HttpResponse {
    let Some(username) = current_user(&state, &req) else { return HttpResponse::Unauthorized().body("Login is required."); };

    let mut name = None::<String>;
    let mut description = None::<String>;
    let mut bot = None::<Vec<u8>>;
    let mut bot_filename = None::<String>;
    let mut thumb = None::<Vec<u8>>;
    let mut preview_files: Vec<Vec<u8>> = Vec::new();

    while let Some(item) = payload.next().await {
        let field = match item { Ok(v) => v, Err(e) => return HttpResponse::BadRequest().body(e.to_string()) };
        let field_name = field.name().unwrap_or("").to_string();
        let original_filename = field
            .content_disposition()
            .and_then(|cd| cd.get_filename())
            .map(|v| v.to_string());
        let data = match read_field(field).await { Ok(v) => v, Err(e) => return HttpResponse::BadRequest().body(e.to_string()) };
        match field_name.as_str() {
            "name" => name = Some(String::from_utf8_lossy(&data).trim().to_string()),
            "description" => description = Some(String::from_utf8_lossy(&data).trim().to_string()),
            "bot" => { bot_filename = original_filename; bot = Some(data); },
            "thumbnail" => thumb = Some(data),
            "previews" => { if !data.is_empty() { preview_files.push(data); } },
            _ => {}
        }
    }

    let name = name.filter(|s| !s.is_empty());
    let desc = description.unwrap_or_default();
    let Some(name) = name else { return HttpResponse::BadRequest().body("Robot name is required."); };
    if name.len() > 120 || desc.len() > 2000 { return HttpResponse::BadRequest().body("Input is too long."); }
    let Some(bot) = bot.filter(|b| !b.is_empty() && b.len() <= 32 * 1024 * 1024) else { return HttpResponse::BadRequest().body("Bot file is required."); };
    let Some(bot_filename) = bot_filename.filter(|f| !f.is_empty()) else { return HttpResponse::BadRequest().body("Bot filename is required."); };
    let Some(thumb) = thumb else { return HttpResponse::BadRequest().body("Thumbnail is required."); };
    if thumb.len() > 12 * 1024 * 1024 { return HttpResponse::BadRequest().body("Image is too large."); }

    let bot_info = match validate_bot_file(&bot) {
        Ok(info) => info,
        Err(e) => return HttpResponse::BadRequest().body(e.to_string()),
    };

    let encoded_footer = BASE64.encode(&bot_info.footer);
    let expected_suffix = encoded_footer.replace('/', "#");
    let Some((account_id, supplied_suffix)) = bot_filename.strip_suffix(".bot").or_else(|| bot_filename.strip_suffix(".BOT")).and_then(|stem| stem.split_once('_')) else {
        return HttpResponse::BadRequest().body("Invalid bot filename. Expected <account-id>_<footer-base64>.bot.");
    };
    if account_id.is_empty()
        || account_id.len() > 128
        || account_id.bytes().any(|b| !b.is_ascii_alphanumeric() && b != b'-' && b != b'.')
    {
        return HttpResponse::BadRequest().body("Invalid bot filename account ID.");
    }
    if supplied_suffix != expected_suffix {
        return HttpResponse::BadRequest().body("Invalid bot filename checksum suffix. The filename must contain the Base64 MD5 footer (with '/' replaced by '#').");
    }
    let canonical_bot_file_name = format!("{}_{}.bot", account_id, expected_suffix);
    let processed_thumbnail = match make_thumbnail(&thumb) { Ok(v) => v, Err(e) => return HttpResponse::BadRequest().body(e.to_string()) };
    if preview_files.len() > 12 { return HttpResponse::BadRequest().body("You can upload up to 12 preview images."); }
    let mut processed_previews = Vec::new();
    for (i, data) in preview_files.into_iter().enumerate() {
        if data.len() > 16 * 1024 * 1024 { return HttpResponse::BadRequest().body("A preview image is too large."); }
        let jpeg = match make_image_jpeg(&data, PREVIEW_MAX_BYTES, 1920) { Ok(v) => v, Err(e) => return HttpResponse::BadRequest().body(e.to_string()) };
        processed_previews.push((format!("{}.jpg", i), jpeg));
    }
    let id = Uuid::new_v4().to_string();
    let robot = Robot {
        id: id.clone(), name, description: desc, username: username.clone(),
        created_at: now(), account_id: account_id.to_string(), bot_file_name: canonical_bot_file_name.clone(),
        bot_footer_base64: encoded_footer.clone(), bot_file_path: String::new(), thumbnail_path: String::new(), preview_paths: Vec::new(),
    };
    if let Err(e) = state.storage.add_robot(robot.clone(), &bot, &processed_thumbnail, &processed_previews, &bot_info.name, &bot_info.footer) { return HttpResponse::InternalServerError().body(e.to_string()); }
    HttpResponse::Created().json(public_robot(robot))
}


#[delete("/api/robots/{id}")]
pub async fn delete(state: Data<AppState>, req: HttpRequest, id: Path<String>) -> HttpResponse {
    let Some((username, admin)) = current_auth(&state, &req) else {
        return HttpResponse::Unauthorized().body("Login is required.");
    };
    match state.storage.delete_robot(&id, &username, admin) {
        Ok(true) => HttpResponse::NoContent().finish(),
        Ok(false) => HttpResponse::NotFound().finish(),
        Err(AppError::Invalid(message)) => HttpResponse::Forbidden().body(message),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[derive(Serialize)]
struct ImportInfoResponse {
    import_line: String,
}

#[get("/api/robots/{id}/import-info")]
pub async fn import_info(state: Data<AppState>, id: Path<String>) -> HttpResponse {
    let Ok(Some(robot)) = state.storage.robot(&id) else {
        return HttpResponse::NotFound().finish();
    };
    match state.storage.index_entry(&robot) {
        Ok(line) => HttpResponse::Ok().json(ImportInfoResponse { import_line: line }),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/robots/{id}/download")]
pub async fn download(state: Data<AppState>, id: Path<String>) -> HttpResponse {
    let Ok(Some(robot)) = state.storage.robot(&id) else { return HttpResponse::NotFound().finish(); };
    match std::fs::read(state.storage.bot_path(&robot)) {
        Ok(bytes) => {
            let filename = if bytes.len() >= 16 {
                let footer = &bytes[bytes.len() - 16..];
                format!("{}_{}.bot", robot.account_id, BASE64.encode(footer).replace('/', "#"))
            } else {
                robot.bot_file_name.clone()
            };
            HttpResponse::Ok()
                .insert_header(("Content-Type", "application/octet-stream"))
                .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"", filename)))
                .body(bytes)
        },
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/robots/{id}/thumbnail")]
pub async fn thumbnail(state: Data<AppState>, id: Path<String>) -> HttpResponse {
    let Ok(Some(robot)) = state.storage.robot(&id) else { return HttpResponse::NotFound().finish(); };
    match std::fs::read(state.storage.thumb_path(&robot)) {
        Ok(bytes) => HttpResponse::Ok().insert_header(("Content-Type", "image/jpeg")).body(bytes),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/robots/{id}/preview/{index}")]
pub async fn preview(state: Data<AppState>, path: Path<(String, usize)>) -> HttpResponse {
    let (id, index) = path.into_inner();
    let Ok(Some(robot)) = state.storage.robot(&id) else { return HttpResponse::NotFound().finish(); };
    let Some(path) = state.storage.preview_path(&robot, index) else { return HttpResponse::NotFound().finish(); };
    match std::fs::read(path) {
        Ok(bytes) => HttpResponse::Ok().insert_header(("Content-Type", "image/jpeg")).body(bytes),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
