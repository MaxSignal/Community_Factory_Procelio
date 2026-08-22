mod cli;
mod robocraft;

use actix_web::{web, App, HttpServer};
use robocraft::app::{AppState, Storage};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let cli_args = cli::CliArgs::get();
    let storage = Storage::new(&cli_args.data).map_err(|e| std::io::Error::other(e.to_string()))?;
    let state = web::Data::new(AppState::new(storage));

    log::info!("rc_factory_web listening on {}:{}", cli_args.ip, cli_args.port);

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .app_data(web::PayloadConfig::new(32 * 1024 * 1024))
            .service(robocraft::web_ui::index)
            .service(robocraft::web_ui::app_js)
            .service(robocraft::web_ui::i18n_js)
            .service(robocraft::web_ui::favicon)
            .service(robocraft::auth_api::register)
            .service(robocraft::auth_api::login)
            .service(robocraft::auth_api::logout)
            .service(robocraft::auth_api::me)
            .service(robocraft::factory::crf_api::list)
            .service(robocraft::factory::crf_api::get)
            .service(robocraft::factory::crf_api::upload)
            .service(robocraft::factory::crf_api::delete)
            .service(robocraft::factory::crf_api::import_info)
            .service(robocraft::factory::crf_api::download)
            .service(robocraft::factory::crf_api::thumbnail)
            .service(robocraft::factory::crf_api::preview)
            .service(robocraft::reports_api::create)
            .service(robocraft::reports_api::list)
            .service(robocraft::reports_api::delete)
    })
    .bind((cli_args.ip, cli_args.port))?
    .run()
    .await
}
