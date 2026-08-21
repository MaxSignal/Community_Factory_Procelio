use clap::Parser;

#[derive(Parser, Debug, Clone)]
#[command(version, about, long_about = None)]
pub struct CliArgs {
    /// TCP port on which to accept connections
    #[arg(short, long, default_value_t = 8012)]
    pub port: u16,

    /// IP Address on which to accept connections
    #[arg(long, default_value_t = "127.0.0.1".to_string())]
    pub ip: String,

    /// Persistent data root
    #[arg(long, default_value_t = "../data/robocraft-factory".to_string())]
    pub data: String,
}

impl CliArgs {
    pub fn get() -> Self { Self::parse() }
}
