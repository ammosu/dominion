use super::{decide_turn_action, is_late_game, AiPlayer};
use crate::{action::PlayerAction, card::Card, game::GameState};

/// "Big Money": buys only Treasure and Victory cards, plays whatever Actions
/// it happens to gain.
pub struct SimpleAi;

impl SimpleAi {
    pub fn new() -> Self {
        SimpleAi
    }

    fn decide_purchase(game: &GameState, player_idx: usize) -> Option<Card> {
        let coins = game.players[player_idx].coins;
        let late = is_late_game(game);
        let available = |card: Card| game.supply_count(card) > 0;

        if coins >= 8 && available(Card::Province) {
            Some(Card::Province)
        } else if coins >= 6 && !late && available(Card::Gold) {
            Some(Card::Gold)
        } else if coins >= 5 && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 3 && available(Card::Silver) {
            Some(Card::Silver)
        } else if coins >= 2 && late && available(Card::Estate) {
            Some(Card::Estate)
        } else {
            None
        }
    }
}

impl AiPlayer for SimpleAi {
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        decide_turn_action(game, player_idx, Self::decide_purchase)
    }

    fn name(&self) -> &str {
        "SimpleAi"
    }
}
