mod ai;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::{routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use shared as shared;  // Make shared accessible as crate::shared in AI modules
use shared::action::PlayerAction;
use shared::game::{GameState, PlayerInfo};
use tower_http::services::ServeDir;
use uuid::Uuid;
use ai::{simple::SimpleAi, AiPlayer};

type Games = Arc<Mutex<HashMap<String, GameState>>>;

#[derive(Deserialize)]
struct NewGameRequest {
    players: Vec<PlayerInfo>,
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
    let game = GameState::new(req.players);

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

async fn execute_ai_turn(
    Path(game_id): Path<String>,
    State(games): State<Arc<Mutex<HashMap<String, GameState>>>>,
) -> Result<Json<GameState>, StatusCode> {
    let ai = SimpleAi::new();
    const MAX_ACTIONS: usize = 20;

    for _ in 0..MAX_ACTIONS {
        let current_player_idx;
        let new_player_idx;

        {
            let mut games_guard = games.lock().unwrap();
            let game = games_guard.get_mut(&game_id).ok_or(StatusCode::NOT_FOUND)?;

            current_player_idx = game.current_player;
            let is_ai = game.players[current_player_idx].is_ai;

            // Only execute if current player is AI
            if !is_ai {
                return Ok(Json(game.clone()));
            }

            // Get AI decision
            let action = match ai.decide_action(game, current_player_idx) {
                Some(action) => action,
                None => {
                    // No valid action, end phase
                    PlayerAction::EndPhase
                }
            };

            // Execute the action
            if let Err(e) = game.execute(action) {
                eprintln!("AI action failed: {}", e);
                // On error, try to end phase
                let _ = game.execute(PlayerAction::EndPhase);
                return Ok(Json(game.clone()));
            }

            new_player_idx = game.current_player;
        } // Release lock before sleep

        // Small delay to make AI visible
        thread::sleep(Duration::from_millis(500));

        // Check if turn ended (switched to another player or still AI's turn)
        {
            let games_guard = games.lock().unwrap();
            let game = games_guard.get(&game_id).ok_or(StatusCode::NOT_FOUND)?;

            // If player changed or new player is not AI, we're done
            if new_player_idx != current_player_idx || !game.players[new_player_idx].is_ai {
                return Ok(Json(game.clone()));
            }
        }
    }

    // Safety limit reached
    let games_guard = games.lock().unwrap();
    let game = games_guard.get(&game_id).ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(game.clone()))
}

#[tokio::main]
async fn main() {
    let games: Games = Arc::new(Mutex::new(HashMap::new()));

    let api = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/game/new", post(new_game))
        .route("/api/game/{id}", get(get_game))
        .route("/api/game/{id}/action", post(game_action))
        .route("/api/game/{id}/ai-turn", post(execute_ai_turn))
        .with_state(games);

    let app = api.fallback_service(ServeDir::new("frontend"));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
