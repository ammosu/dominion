use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::card::Card;
use crate::player::Player;

pub type Supply = HashMap<Card, u32>;

#[derive(Debug, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub is_ai: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TurnPhase {
    Action,
    Buy,
    Cleanup,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub players: Vec<Player>,
    pub supply: Supply,
    pub current_player: usize,
    pub phase: TurnPhase,
    pub trash: Vec<Card>,
    pub game_over: bool,
    pub log: Vec<String>,
}

impl GameState {
    pub fn new(player_info: Vec<PlayerInfo>) -> Self {
        let num_players = player_info.len();

        let players: Vec<Player> = player_info
            .into_iter()
            .map(|info| Player::new(info.name, info.is_ai))
            .collect();

        let mut supply = HashMap::new();

        // Treasure cards
        supply.insert(Card::Copper, 60 - (7 * num_players as u32));
        supply.insert(Card::Silver, 40);
        supply.insert(Card::Gold, 30);

        // Victory cards: 8 for 2 players, 12 for 3-4
        let victory_count = if num_players <= 2 { 8 } else { 12 };
        supply.insert(Card::Estate, victory_count);
        supply.insert(Card::Duchy, victory_count);
        supply.insert(Card::Province, victory_count);

        // Curse cards: 10 per player beyond the first
        let curse_count = (num_players as u32 - 1) * 10;
        supply.insert(Card::Curse, curse_count);

        // Kingdom (action) cards: 10 each
        supply.insert(Card::Cellar, 10);
        supply.insert(Card::Market, 10);
        supply.insert(Card::Militia, 10);
        supply.insert(Card::Mine, 10);
        supply.insert(Card::Moat, 10);
        supply.insert(Card::Remodel, 10);
        supply.insert(Card::Smithy, 10);
        supply.insert(Card::Village, 10);
        supply.insert(Card::Woodcutter, 10);
        supply.insert(Card::Workshop, 10);

        GameState {
            players,
            supply,
            current_player: 0,
            phase: TurnPhase::Action,
            trash: Vec::new(),
            game_over: false,
            log: vec!["Game started!".to_string()],
        }
    }
}
