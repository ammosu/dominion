use axum::{Router, Json, routing::get};
use shared::game::GameState;

async fn health_check() -> &'static str {
    "Dominion Game Server"
}

async fn new_game() -> Json<GameState> {
    let player_names = vec!["Player 1".to_string(), "Player 2".to_string()];
    let game = GameState::new(player_names);
    Json(game)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/game/new", get(new_game));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
