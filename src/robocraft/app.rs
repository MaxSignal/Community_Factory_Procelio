use argon2::{password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString}, Argon2};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::{Path, PathBuf}, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use thiserror::Error;
use uuid::Uuid;

pub const THUMB_MAX_BYTES: usize = 1024 * 1024;
pub const THUMB_RATIO: f64 = 216.0 / 116.0;
pub const PREVIEW_MAX_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("password error: {0}")]
    Password(String),
    #[error("image error: {0}")]
    Image(String),
    #[error("invalid request: {0}")]
    Invalid(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub password_hash: String,
    #[serde(default)]
    pub admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Robot {
    pub id: String,
    pub name: String,
    pub description: String,
    pub username: String,
    pub created_at: u64,
    pub bot_file_name: String,
    pub bot_file_path: String,
    pub thumbnail_path: String,
    #[serde(default)]
    pub preview_paths: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PublicRobot {
    pub id: String,
    pub name: String,
    pub description: String,
    pub username: String,
    pub created_at: u64,
    pub thumbnail_url: String,
    pub download_url: String,
    pub preview_urls: Vec<String>,
}

#[derive(Clone)]
pub struct Storage {
    root: PathBuf,
    users_file: PathBuf,
    robots_file: PathBuf,
    index_file: PathBuf,
}

impl Storage {
    pub fn new(root: impl AsRef<Path>) -> Result<Self, AppError> {
        let root = root.as_ref().to_path_buf();
        fs::create_dir_all(root.join("bots"))?;
        fs::create_dir_all(root.join("thumbnails"))?;
        fs::create_dir_all(root.join("previews"))?;
        let users_file = root.join("users.json");
        let robots_file = root.join("robots.json");
        let index_file = root.join("index.file");
        if !users_file.exists() { fs::write(&users_file, "[]")?; }
        if !robots_file.exists() { fs::write(&robots_file, "[]")?; }
        if !index_file.exists() { fs::write(&index_file, b"")?; }
        Ok(Self { root, users_file, robots_file, index_file })
    }

    fn read_users(&self) -> Result<Vec<User>, AppError> {
        let mut users: Vec<User> = serde_json::from_slice(&fs::read(&self.users_file)?)?;
        if !users.is_empty() && !users.iter().any(|u| u.admin) {
            users[0].admin = true;
            self.write_users(&users)?;
        }
        Ok(users)
    }
    fn write_users(&self, users: &[User]) -> Result<(), AppError> {
        fs::write(&self.users_file, serde_json::to_vec_pretty(users)?)?;
        Ok(())
    }
    fn read_robots(&self) -> Result<Vec<Robot>, AppError> {
        Ok(serde_json::from_slice(&fs::read(&self.robots_file)?)?)
    }
    fn write_robots(&self, robots: &[Robot]) -> Result<(), AppError> {
        fs::write(&self.robots_file, serde_json::to_vec_pretty(robots)?)?;
        Ok(())
    }

    pub fn register(&self, username: &str, password: &str) -> Result<(), AppError> {
        let username = username.trim();
        if username.len() < 2 || username.len() > 32 { return Err(AppError::Invalid("Username must be between 2 and 32 characters.".into())); }
        if password.len() < 6 || password.len() > 128 { return Err(AppError::Invalid("Password must be between 6 and 128 characters.".into())); }
        if !username.chars().all(|c| c.is_alphanumeric() || matches!(c, '_' | '-' | '.')) {
            return Err(AppError::Invalid("Username may contain only letters, numbers, _, -, and .".into()));
        }
        let mut users = self.read_users()?;
        if users.iter().any(|u| u.username.eq_ignore_ascii_case(username)) {
            return Err(AppError::Invalid("That username is already in use.".into()));
        }
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default().hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Password(e.to_string()))?
            .to_string();
        let admin = users.is_empty();
        users.push(User { username: username.to_owned(), password_hash: hash, admin });
        self.write_users(&users)
    }

    pub fn authenticate(&self, username: &str, password: &str) -> Result<Option<(String, bool)>, AppError> {
        let Some(user) = self.read_users()?.into_iter().find(|u| u.username.eq_ignore_ascii_case(username.trim())) else { return Ok(None); };
        let parsed = PasswordHash::new(&user.password_hash)
            .map_err(|e| AppError::Password(e.to_string()))?;
        if Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok() {
            Ok(Some((user.username, user.admin)))
        } else {
            Ok(None)
        }
    }

    pub fn is_admin(&self, username: &str) -> Result<bool, AppError> {
        Ok(self.read_users()?.into_iter().find(|u| u.username.eq_ignore_ascii_case(username)).map(|u| u.admin).unwrap_or(false))
    }

    pub fn add_robot(&self, mut robot: Robot, bot: &[u8], thumb: &[u8], previews: &[(String, Vec<u8>)], bot_name: &str, footer: &[u8]) -> Result<(), AppError> {
        fs::write(self.root.join("bots").join(&robot.bot_file_name), bot)?;
        fs::write(self.root.join("thumbnails").join(format!("{}.jpg", robot.id)), thumb)?;
        robot.bot_file_path = format!("bots/{}", robot.bot_file_name);
        robot.thumbnail_path = format!("thumbnails/{}.jpg", robot.id);
        let preview_dir = self.root.join("previews").join(&robot.id);
        fs::create_dir_all(&preview_dir)?;
        robot.preview_paths.clear();
        for (filename, bytes) in previews {
            fs::write(preview_dir.join(filename), bytes)?;
            robot.preview_paths.push(format!("previews/{}/{}", robot.id, filename));
        }
        self.update_index_file(&robot.bot_file_name, bot_name, footer)?;
        let mut robots = self.read_robots()?;
        robots.push(robot);
        self.write_robots(&robots)
    }

    fn update_index_file(&self, filename: &str, bot_name: &str, footer: &[u8]) -> Result<(), AppError> {
        use base64::{engine::general_purpose::STANDARD, Engine as _};
        let encoded_filename = STANDARD.encode(filename.as_bytes());
        let encoded_name = STANDARD.encode(bot_name.as_bytes());
        let encoded_footer = STANDARD.encode(footer);
        let existing = fs::read_to_string(&self.index_file).unwrap_or_default();
        let normalized = existing.replace("\r\n", "\n").replace('\r', "\n");
        let mut found = false;
        let mut lines = Vec::new();
        for raw in normalized.lines() {
            if raw.is_empty() { continue; }
            let mut fields: Vec<&str> = raw.split(',').collect();
            if fields.len() < 5 { continue; }
            let decoded_name = STANDARD.decode(fields[1]).ok().and_then(|v| String::from_utf8(v).ok());
            if decoded_name.as_deref() == Some(bot_name) {
                fields[0] = &encoded_filename;
                fields[4] = &encoded_footer;
                found = true;
            }
            lines.push(fields.join(","));
        }
        if !found { lines.push(format!("{},{},,,{}", encoded_filename, encoded_name, encoded_footer)); }
        let mut out = lines.join("\r\n");
        if !out.is_empty() { out.push_str("\r\n"); }
        fs::write(&self.index_file, out.as_bytes())?;
        Ok(())
    }

    fn remove_index_entry(&self, filename: &str) -> Result<(), AppError> {
        use base64::{engine::general_purpose::STANDARD, Engine as _};
        let encoded = STANDARD.encode(filename.as_bytes());
        let existing = fs::read_to_string(&self.index_file).unwrap_or_default();
        let normalized = existing.replace("\r\n", "\n").replace('\r', "\n");
        let mut lines = Vec::new();
        for raw in normalized.lines() {
            if raw.is_empty() { continue; }
            let first = raw.split(',').next().unwrap_or_default();
            if first != encoded { lines.push(raw.to_string()); }
        }
        let mut out = lines.join("\r\n");
        if !out.is_empty() { out.push_str("\r\n"); }
        fs::write(&self.index_file, out.as_bytes())?;
        Ok(())
    }

    pub fn robots(&self) -> Result<Vec<Robot>, AppError> { self.read_robots() }
    pub fn robot(&self, id: &str) -> Result<Option<Robot>, AppError> { Ok(self.read_robots()?.into_iter().find(|r| r.id == id)) }

    pub fn delete_robot(&self, id: &str, username: &str, admin: bool) -> Result<bool, AppError> {
        let mut robots = self.read_robots()?;
        let Some(index) = robots.iter().position(|r| r.id == id) else { return Ok(false); };
        if !admin && !robots[index].username.eq_ignore_ascii_case(username) {
            return Err(AppError::Invalid("You can only delete your own bots.".into()));
        }
        let robot = robots.remove(index);
        let _ = fs::remove_file(self.bot_path(&robot));
        let _ = fs::remove_file(self.thumb_path(&robot));
        let _ = fs::remove_dir_all(self.root.join("previews").join(&robot.id));
        self.remove_index_entry(&robot.bot_file_name)?;
        self.write_robots(&robots)?;
        Ok(true)
    }
    pub fn bot_path(&self, robot: &Robot) -> PathBuf { self.root.join(&robot.bot_file_path) }
    pub fn thumb_path(&self, robot: &Robot) -> PathBuf { self.root.join(&robot.thumbnail_path) }
    pub fn preview_path(&self, robot: &Robot, index: usize) -> Option<PathBuf> { robot.preview_paths.get(index).map(|p| self.root.join(p)) }
}

pub struct AppState {
    pub storage: Storage,
    pub sessions: Mutex<HashMap<String, (String, bool)>>,
}

impl AppState {
    pub fn new(storage: Storage) -> Self { Self { storage, sessions: Mutex::new(HashMap::new()) } }
    pub fn new_session(&self, username: String, admin: bool) -> String {
        let token = Uuid::new_v4().to_string();
        self.sessions.lock().unwrap().insert(token.clone(), (username, admin));
        token
    }
    pub fn username_for_token(&self, token: &str) -> Option<String> { self.sessions.lock().unwrap().get(token).map(|(u, _)| u.clone()) }
    pub fn auth_for_token(&self, token: &str) -> Option<(String, bool)> { self.sessions.lock().unwrap().get(token).cloned() }
    pub fn remove_session(&self, token: &str) { self.sessions.lock().unwrap().remove(token); }
}

pub fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }

pub fn public_robot(robot: Robot) -> PublicRobot {
    PublicRobot {
        id: robot.id.clone(),
        name: robot.name,
        description: robot.description,
        username: robot.username,
        created_at: robot.created_at,
        thumbnail_url: format!("/api/robots/{}/thumbnail", robot.id),
        download_url: format!("/api/robots/{}/download", robot.id),
        preview_urls: robot.preview_paths.iter().enumerate().map(|(i, _)| format!("/api/robots/{}/preview/{}", robot.id, i)).collect(),
    }
}
