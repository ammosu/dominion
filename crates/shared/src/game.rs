use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::card::Card;
use crate::decision::{Decision, Effect};
use crate::player::Player;

pub type Supply = HashMap<Card, u32>;

#[derive(Debug, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub is_ai: bool,
}

/// Clean-up happens instantly when the Buy phase ends, so it is not a phase
/// a player can act in.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TurnPhase {
    Action,
    Buy,
}

/// Per-turn bookkeeping, reset at clean-up.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TurnState {
    /// Merchants played this turn; each gives +$1 on the first Silver.
    pub merchants_played: u32,
    pub silver_played: bool,
    /// Once a card is bought, no more Treasures may be played this turn.
    pub has_bought: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub players: Vec<Player>,
    pub supply: Supply,
    /// The 10 Kingdom cards in use, sorted by cost.
    pub kingdom: Vec<Card>,
    pub current_player: usize,
    pub phase: TurnPhase,
    pub turn: TurnState,
    pub trash: Vec<Card>,
    pub pending_decision: Option<Decision>,
    #[serde(skip)]
    pub effects: Vec<Effect>,
    pub game_over: bool,
    pub log: Vec<String>,
    pub scores: Option<Vec<(String, i32)>>,
    pub winners: Vec<String>,
}

impl GameState {
    pub fn new(player_info: Vec<PlayerInfo>, kingdom: &[Card]) -> Self {
        let num_players = player_info.len() as u32;

        let players: Vec<Player> = player_info
            .into_iter()
            .map(|info| Player::new(info.name, info.is_ai))
            .collect();

        // Victory piles: 8 for 2 players, 12 for 3-4 (rulebook p.3).
        let victory_count = if num_players <= 2 { 8 } else { 12 };

        let mut supply = HashMap::new();
        supply.insert(Card::Copper, 60 - 7 * num_players);
        supply.insert(Card::Silver, 40);
        supply.insert(Card::Gold, 30);
        supply.insert(Card::Estate, victory_count);
        supply.insert(Card::Duchy, victory_count);
        supply.insert(Card::Province, victory_count);
        supply.insert(Card::Curse, num_players.saturating_sub(1) * 10);

        let mut kingdom: Vec<Card> = kingdom.to_vec();
        kingdom.sort_by_key(|card| (card.cost(), *card));
        kingdom.dedup();
        for &card in &kingdom {
            let count = if card.is_victory() { victory_count } else { 10 };
            supply.insert(card, count);
        }

        GameState {
            players,
            supply,
            kingdom,
            current_player: 0,
            phase: TurnPhase::Action,
            turn: TurnState::default(),
            trash: Vec::new(),
            pending_decision: None,
            effects: Vec::new(),
            game_over: false,
            log: vec!["Game started!".to_string()],
            scores: None,
            winners: Vec::new(),
        }
    }

    pub fn supply_count(&self, card: Card) -> u32 {
        self.supply.get(&card).copied().unwrap_or(0)
    }

    pub fn empty_piles(&self) -> usize {
        self.supply.values().filter(|&&count| count == 0).count()
    }

    /// Province pile empty, or 3 piles empty (4 with 5+ players).
    pub fn is_game_over(&self) -> bool {
        let pile_limit = if self.players.len() >= 5 { 4 } else { 3 };
        self.supply_count(Card::Province) == 0 || self.empty_piles() >= pile_limit
    }

    pub fn calculate_scores(&self) -> Vec<(String, i32)> {
        self.players
            .iter()
            .map(|player| (player.name.clone(), player.victory_points()))
            .collect()
    }

    /// Most points wins; among tied players, the one with fewer turns wins;
    /// remaining ties share the victory.
    pub fn determine_winners(&self) -> Vec<String> {
        let ranked: Vec<(i32, std::cmp::Reverse<u32>)> = self
            .players
            .iter()
            .map(|p| (p.victory_points(), std::cmp::Reverse(p.turns_taken)))
            .collect();
        let Some(best) = ranked.iter().max() else {
            return Vec::new();
        };
        self.players
            .iter()
            .zip(&ranked)
            .filter(|(_, rank)| *rank == best)
            .map(|(p, _)| p.name.clone())
            .collect()
    }
}
