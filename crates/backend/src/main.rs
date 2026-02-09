use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::{routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use shared::action::PlayerAction;
use shared::game::GameState;
use tower_http::services::ServeDir;
use uuid::Uuid;

type Games = Arc<Mutex<HashMap<String, GameState>>>;

#[derive(Deserialize)]
struct NewGameRequest {
    player_names: Vec<String>,
}

#[derive(Serialize)]
struct NewGameResponse {
    game_id: String,
    state: GameState,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn health_check() -> &'static str {
    "Dominion Game Server"
}

async fn new_game(
    State(games): State<Games>,
    Json(req): Json<NewGameRequest>,
) -> impl IntoResponse {
    let game_id = Uuid::new_v4().to_string();
    let game = GameState::new(req.player_names);

    let response = NewGameResponse {
        game_id: game_id.clone(),
        state: game.clone(),
    };

    games.lock().unwrap().insert(game_id, game);

    (StatusCode::OK, Json(response))
}

async fn get_game(
    State(games): State<Games>,
    Path(game_id): Path<String>,
) -> impl IntoResponse {
    let games = games.lock().unwrap();
    match games.get(&game_id) {
        Some(game) => Ok(Json(game.clone())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Game not found".to_string(),
            }),
        )),
    }
}

async fn game_action(
    State(games): State<Games>,
    Path(game_id): Path<String>,
    Json(action): Json<PlayerAction>,
) -> impl IntoResponse {
    let mut games = games.lock().unwrap();
    let Some(game) = games.get_mut(&game_id) else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Game not found".to_string(),
            }),
        ));
    };

    match game.execute(action) {
        Ok(_) => Ok(Json(game.clone())),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )),
    }
}

#[tokio::main]
async fn main() {
    let games: Games = Arc::new(Mutex::new(HashMap::new()));

    let api = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/game/new", post(new_game))
        .route("/api/game/{id}", get(get_game))
        .route("/api/game/{id}/action", post(game_action))
        .with_state(games);

    let app = api.fallback_service(ServeDir::new("frontend"));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
