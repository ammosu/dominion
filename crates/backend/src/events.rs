use serde::{Deserialize, Serialize};
use shared::game::GameState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    PlayCard { card: String },
    PlayTreasure { card: String },
    BuyCard { card: String },
    EndPhase,
    PlayCellar { cards: Vec<String> },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimationHint {
    #[serde(rename = "type")]
    pub hint_type: String,
    pub from: String,
    pub to: String,
    pub card: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: ServerPayload,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerPayload {
    pub game_state: GameState,
    pub animation_hints: Option<AnimationHint>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared::game::PlayerInfo;

    #[test]
    fn test_server_message_serialization() {
        let players = vec![
            PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ];

        let game_state = GameState::new(players);

        let message = ServerMessage {
            msg_type: "GameStateUpdate".to_string(),
            payload: ServerPayload {
                game_state,
                animation_hints: None,
            },
        };

        let json = serde_json::to_string(&message).unwrap();
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Verify message structure
        assert!(value.get("type").is_some(), "type field should exist");
        assert_eq!(value["type"], "GameStateUpdate");

        assert!(value.get("payload").is_some(), "payload field should exist");
        let payload = &value["payload"];

        assert!(payload.get("game_state").is_some(), "game_state field should exist");
        let game_state = &payload["game_state"];

        // Verify supply and trash in game_state
        assert!(game_state.get("supply").is_some(), "supply field should exist in game_state");
        assert!(game_state["supply"].is_object(), "supply should be an object");

        assert!(game_state.get("trash").is_some(), "trash field should exist in game_state");
        assert!(game_state["trash"].is_array(), "trash should be an array");

        let supply = game_state["supply"].as_object().unwrap();
        assert!(supply.len() > 0, "supply should have entries");

        println!("✓ ServerMessage serialization verified");
        println!("  - Full WebSocket message structure is correct");
        println!("  - game_state.supply has {} entries", supply.len());
        println!("  - game_state.trash is an array");
    }
}
