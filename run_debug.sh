#!/bin/bash
set -euo pipefail
RUST_LOG=info cargo run -- --ip 127.0.0.1 --port 8012 --data ../data/robocraft-factory
