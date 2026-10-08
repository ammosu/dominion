mod ai;
mod events;
mod websocket;

use axum::{routing::get, Router};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

async fn health_check() -> &'static str {
    "Dominion Game Server"
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/ws", get(websocket::websocket_handler))
        .layer(cors)
        .fallback_service(ServeDir::new("frontend"));

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    println!("Server running on {}", addr);
    axum::serve(listener, app).await.unwrap();
}
