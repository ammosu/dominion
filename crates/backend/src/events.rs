use serde::{Deserialize, Serialize};
use shared::action::PlayerAction;
use shared::card::Card;
use shared::game::GameState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    PlayCard { card: Card },
    PlayTreasure { card: Card },
    PlayAllTreasures,
    BuyCard { card: Card },
    EndPhase,
    /// Answer the pending decision addressed to this player.
    Resolve { cards: Vec<Card> },
}

impl From<ClientMessage> for PlayerAction {
    fn from(message: ClientMessage) -> Self {
        match message {
            ClientMessage::PlayCard { card } => PlayerAction::PlayCard { card },
            ClientMessage::PlayTreasure { card } => PlayerAction::PlayTreasure { card },
            ClientMessage::PlayAllTreasures => PlayerAction::PlayAllTreasures,
            ClientMessage::BuyCard { card } => PlayerAction::BuyCard { card },
            ClientMessage::EndPhase => PlayerAction::EndPhase,
            ClientMessage::Resolve { cards } => PlayerAction::Resolve { cards },
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ServerMessage {
    #[serde(rename = "type")]
    pub msg_type: &'static str,
    pub payload: ServerPayload,
}

#[derive(Debug, Serialize)]
pub struct ServerPayload {
    pub game_state: GameState,
    /// Index of the player this connection controls.
    pub viewer: usize,
    /// Why the last client message was rejected, if it was.
    pub error: Option<String>,
}

impl ServerMessage {
    pub fn state_update(game_state: GameState, viewer: usize, error: Option<String>) -> Self {
        ServerMessage {
            msg_type: "GameStateUpdate",
            payload: ServerPayload { game_state, viewer, error },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared::card::recommended_kingdom;
    use shared::game::PlayerInfo;

    #[test]
    fn server_message_has_flat_type_and_payload() {
        let players = vec![
            PlayerInfo { name: "Alice".to_string(), is_ai: false },
            PlayerInfo { name: "Bot".to_string(), is_ai: true },
        ];
        let game_state = GameState::new(players, &recommended_kingdom("first-game").unwrap());
        let value = serde_json::to_value(ServerMessage::state_update(game_state, 0, None)).unwrap();

        assert_eq!(value["type"], "GameStateUpdate");
        assert_eq!(value["payload"]["viewer"], 0);
        assert!(value["payload"]["error"].is_null());
        assert!(value["payload"]["game_state"]["supply"].is_object());
        assert!(value["payload"]["game_state"]["trash"].is_array());
    }

    #[test]
    fn client_messages_parse_flat_objects_and_card_ids() {
        let msg: ClientMessage = serde_json::from_str(r#"{"type":"BuyCard","card":"CouncilRoom"}"#).unwrap();
        assert!(matches!(msg, ClientMessage::BuyCard { card: Card::CouncilRoom }));
        let msg: ClientMessage =
            serde_json::from_str(r#"{"type":"Resolve","cards":["Estate","Copper"]}"#).unwrap();
        assert!(matches!(msg, ClientMessage::Resolve { cards } if cards == vec![Card::Estate, Card::Copper]));
        assert!(serde_json::from_str::<ClientMessage>(r#"{"type":"BuyCard","card":"Woodcutter"}"#).is_err());
    }
}
