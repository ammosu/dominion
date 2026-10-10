//! Runs a full human-vs-AI game in the browser. Messages use the same JSON
//! protocol as the WebSocket server, so the frontend can swap transports.

use shared::session::Session;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmGame {
    session: Session,
}

#[wasm_bindgen]
impl WasmGame {
    /// Same options as the server's `/ws?difficulty=&kingdom=&name=&opponent=`.
    #[wasm_bindgen(constructor)]
    pub fn new(difficulty: &str, kingdom: &str, name: &str, opponent: &str) -> WasmGame {
        WasmGame { session: Session::new(difficulty, Some(kingdom), Some(name), Some(opponent)) }
    }

    /// Initial `GameStateUpdate` as JSON.
    pub fn start(&mut self) -> String {
        to_json(&self.session.start())
    }

    /// Handles one client message (JSON) and returns the `GameStateUpdate` JSON.
    pub fn send(&mut self, message: &str) -> String {
        to_json(&self.session.handle(message))
    }
}

fn to_json(message: &shared::protocol::ServerMessage) -> String {
    serde_json::to_string(message).expect("game state serializes")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plays_through_the_wasm_api() {
        let mut game = WasmGame::new("medium", "first-game", "Tester", "Bot");
        let start: serde_json::Value = serde_json::from_str(&game.start()).unwrap();
        assert_eq!(start["type"], "GameStateUpdate");
        let reply: serde_json::Value = serde_json::from_str(&game.send(r#"{"type":"EndPhase"}"#)).unwrap();
        assert_eq!(reply["payload"]["game_state"]["phase"], "Buy");
    }
}
