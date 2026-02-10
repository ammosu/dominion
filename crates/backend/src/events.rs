use serde::{Deserialize, Serialize};
use shared::game::GameState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    PlayCard { card: String },
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
