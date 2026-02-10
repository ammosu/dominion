use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};

use crate::events::{ClientMessage, ServerMessage, ServerPayload};
use crate::Games;
use shared::card::Card;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(games): State<Games>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, games))
}

async fn handle_socket(socket: WebSocket, _games: Games) {
    let (mut sender, mut receiver) = socket.split();
    let _game_id = uuid::Uuid::new_v4().to_string();

    // Create test game
    let mut test_game = {
        let players = vec![
            shared::game::PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            shared::game::PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ];
        shared::game::GameState::new(players)
    };

    // Send initial game state
    let init_msg = ServerMessage {
        msg_type: "GameStateUpdate".to_string(),
        payload: ServerPayload {
            game_state: test_game.clone(),
            animation_hints: None,
        },
    };
    if let Ok(text) = serde_json::to_string(&init_msg) {
        let _ = sender.send(Message::Text(text.into())).await;
    }

    // Process messages
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                println!("Received: {:?}", client_msg);

                // Process action
                let action_result = match client_msg {
                    ClientMessage::PlayCard { card } => {
                        if let Ok(card_enum) = parse_card(&card) {
                            test_game.execute(shared::action::PlayerAction::PlayCard { card: card_enum })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::PlayTreasure { card } => {
                        if let Ok(card_enum) = parse_card(&card) {
                            test_game.execute(shared::action::PlayerAction::PlayTreasure { card: card_enum })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::BuyCard { card } => {
                        if let Ok(card_enum) = parse_card(&card) {
                            test_game.execute(shared::action::PlayerAction::BuyCard { card: card_enum })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::EndPhase => {
                        test_game.execute(shared::action::PlayerAction::EndPhase)
                    }
                    ClientMessage::PlayCellar { cards } => {
                        let card_enums: Result<Vec<Card>, _> = cards.iter().map(|s| parse_card(s)).collect();
                        if let Ok(discards) = card_enums {
                            test_game.execute(shared::action::PlayerAction::PlayCellar { discards })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                };

                // Send updated state
                let response = ServerMessage {
                    msg_type: "GameStateUpdate".to_string(),
                    payload: ServerPayload {
                        game_state: test_game.clone(),
                        animation_hints: None, // TODO: Add animation hints
                    },
                };

                if let Ok(response_text) = serde_json::to_string(&response) {
                    let _ = sender.send(Message::Text(response_text.into())).await;
                }

                if let Err(e) = action_result {
                    eprintln!("Action error: {}", e);
                }
            }
        }
    }
}

fn parse_card(card_str: &str) -> Result<Card, String> {
    match card_str {
        "Copper" => Ok(Card::Copper),
        "Silver" => Ok(Card::Silver),
        "Gold" => Ok(Card::Gold),
        "Estate" => Ok(Card::Estate),
        "Duchy" => Ok(Card::Duchy),
        "Province" => Ok(Card::Province),
        "Curse" => Ok(Card::Curse),
        "Cellar" => Ok(Card::Cellar),
        "Market" => Ok(Card::Market),
        "Militia" => Ok(Card::Militia),
        "Mine" => Ok(Card::Mine),
        "Moat" => Ok(Card::Moat),
        "Remodel" => Ok(Card::Remodel),
        "Smithy" => Ok(Card::Smithy),
        "Village" => Ok(Card::Village),
        "Woodcutter" => Ok(Card::Woodcutter),
        "Workshop" => Ok(Card::Workshop),
        _ => Err(format!("Unknown card: {}", card_str)),
    }
}
