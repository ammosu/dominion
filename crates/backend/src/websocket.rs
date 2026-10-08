use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use rand::seq::IndexedRandom;
use serde::Deserialize;

use crate::ai::{medium::MediumAi, run_ai_turns, simple::SimpleAi, AiPlayer};
use crate::events::{ClientMessage, ServerMessage};
use shared::card::{recommended_kingdom, Card, KINGDOM_CARDS};
use shared::game::{GameState, PlayerInfo};

const HUMAN: usize = 0;

#[derive(Deserialize)]
pub struct WsQuery {
    #[serde(default = "default_difficulty")]
    difficulty: String,
    /// A recommended set id, "random", or a comma-separated list of 10 card ids.
    #[serde(default)]
    kingdom: Option<String>,
    #[serde(default)]
    name: Option<String>,
}

fn default_difficulty() -> String {
    "medium".to_string()
}

pub async fn websocket_handler(ws: WebSocketUpgrade, Query(query): Query<WsQuery>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, query))
}

pub fn parse_kingdom(spec: Option<&str>) -> Vec<Card> {
    let spec = spec.unwrap_or("first-game");
    if let Some(cards) = recommended_kingdom(spec) {
        return cards.to_vec();
    }
    if spec == "random" {
        return KINGDOM_CARDS.choose_multiple(&mut rand::rng(), 10).copied().collect();
    }
    let mut cards: Vec<Card> = spec
        .split(',')
        .filter_map(|id| serde_json::from_value(serde_json::Value::String(id.trim().to_string())).ok())
        .filter(Card::is_kingdom)
        .collect();
    cards.sort();
    cards.dedup();
    if cards.len() == 10 {
        cards
    } else {
        recommended_kingdom("first-game").unwrap().to_vec()
    }
}

async fn handle_socket(socket: WebSocket, query: WsQuery) {
    let (mut sender, mut receiver) = socket.split();
    let ai: Box<dyn AiPlayer> = if query.difficulty == "simple" {
        Box::new(SimpleAi::new())
    } else {
        Box::new(MediumAi::new())
    };

    let name = query
        .name
        .map(|n| n.trim().chars().take(20).collect::<String>())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| "Alice".to_string());
    let players = vec![
        PlayerInfo { name, is_ai: false },
        PlayerInfo { name: "Bot".to_string(), is_ai: true },
    ];
    let kingdom = parse_kingdom(query.kingdom.as_deref());
    println!("WebSocket connected: AI {}, kingdom {kingdom:?}", ai.name());
    let mut game = GameState::new(players, &kingdom);

    let mut error = None;
    loop {
        // Let the AI act (its turn, or answering our attacks) until the human must act.
        run_ai_turns(&mut game, ai.as_ref());

        let message = ServerMessage::state_update(game.clone(), HUMAN, error.take());
        let Ok(text) = serde_json::to_string(&message) else {
            break;
        };
        if sender.send(Message::Text(text.into())).await.is_err() {
            break;
        }

        let text = loop {
            match receiver.next().await {
                Some(Ok(Message::Text(text))) => break Some(text),
                Some(Ok(_)) => continue,
                _ => break None,
            }
        };
        let Some(text) = text else {
            break;
        };

        error = match serde_json::from_str::<ClientMessage>(&text) {
            Ok(client_msg) => game.execute(HUMAN, client_msg.into()).err().map(|e| e.to_string()),
            Err(e) => Some(format!("Invalid message: {e}")),
        };
        if let Some(e) = &error {
            eprintln!("Rejected client message: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kingdom_spec_parsing() {
        assert_eq!(parse_kingdom(Some("deck-top")), recommended_kingdom("deck-top").unwrap().to_vec());
        assert_eq!(parse_kingdom(Some("random")).len(), 10);
        let custom = "Witch,Laboratory,Market,Festival,Sentry,Library,CouncilRoom,Smithy,Militia,ThroneRoom";
        let parsed = parse_kingdom(Some(custom));
        assert_eq!(parsed.len(), 10);
        assert!(parsed.contains(&Card::ThroneRoom));
        assert_eq!(parse_kingdom(Some("Witch,Copper")), recommended_kingdom("first-game").unwrap().to_vec());
        assert_eq!(parse_kingdom(None), recommended_kingdom("first-game").unwrap().to_vec());
    }
}
