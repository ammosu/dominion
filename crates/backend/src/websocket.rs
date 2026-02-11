use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};

use crate::ai::simple::SimpleAi;
use crate::ai::AiPlayer;
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
                    ClientMessage::PlayAllTreasures => {
                        test_game.execute(shared::action::PlayerAction::PlayAllTreasures)
                    }
                    ClientMessage::PlayCellar { cards } => {
                        let card_enums: Result<Vec<Card>, _> = cards.iter().map(|s| parse_card(s)).collect();
                        if let Ok(discards) = card_enums {
                            test_game.execute(shared::action::PlayerAction::PlayCellar { discards })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::PlayWorkshop { card } => {
                        if let Ok(card_enum) = parse_card(&card) {
                            test_game.execute(shared::action::PlayerAction::PlayWorkshop { gain: card_enum })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::PlayMilitia => {
                        test_game.execute(shared::action::PlayerAction::PlayMilitia)
                    }
                    ClientMessage::PlayMine { trash, gain } => {
                        let trash_card = parse_card(&trash);
                        let gain_card = parse_card(&gain);
                        if let (Ok(t), Ok(g)) = (trash_card, gain_card) {
                            test_game.execute(shared::action::PlayerAction::PlayMine { trash: t, gain: g })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                    ClientMessage::PlayRemodel { trash, gain } => {
                        let trash_card = parse_card(&trash);
                        let gain_card = parse_card(&gain);
                        if let (Ok(t), Ok(g)) = (trash_card, gain_card) {
                            test_game.execute(shared::action::PlayerAction::PlayRemodel { trash: t, gain: g })
                        } else {
                            Err(shared::action::ActionError::InvalidTarget)
                        }
                    }
                };

                if let Err(e) = action_result {
                    eprintln!("Action error: {}", e);
                }

                // Run AI turn if current player is AI
                let ai = SimpleAi::new();
                let max_ai_actions = 20;
                let mut ai_actions = 0;

                while !test_game.game_over && ai_actions < max_ai_actions {
                    let current = test_game.current_player;
                    if !test_game.players[current].is_ai {
                        break;
                    }

                    if let Some(action) = ai.decide_action(&test_game, current) {
                        println!("AI action: {:?}", action);
                        if let Err(e) = test_game.execute(action) {
                            eprintln!("AI action error: {}", e);
                            // Force end phase on error to avoid infinite loop
                            let _ = test_game.execute(shared::action::PlayerAction::EndPhase);
                        }
                        ai_actions += 1;
                    } else {
                        // AI has no action, end phase
                        let _ = test_game.execute(shared::action::PlayerAction::EndPhase);
                        ai_actions += 1;
                    }
                }

                // Send updated state (after AI has finished)
                let response = ServerMessage {
                    msg_type: "GameStateUpdate".to_string(),
                    payload: ServerPayload {
                        game_state: test_game.clone(),
                        animation_hints: None,
                    },
                };

                if let Ok(response_text) = serde_json::to_string(&response) {
                    let _ = sender.send(Message::Text(response_text.into())).await;
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
