use super::{decide_turn_action, gain_value, AiPlayer};
use crate::{action::PlayerAction, card::Card, game::GameState};

/// Money plus a few strong Kingdom cards, greening by game phase.
pub struct MediumAi;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum GamePhase {
    Building, // Early game: build economy
    Greening, // Start buying victory cards
    Endgame,  // Final rush: grab all victory points
}

struct DeckAnalysis {
    total_cards: usize,
    terminals: usize,
    villages: usize,
}

impl MediumAi {
    pub fn new() -> Self {
        MediumAi
    }

    fn analyze_deck(game: &GameState, player_idx: usize) -> DeckAnalysis {
        let cards: Vec<Card> = game.players[player_idx].all_cards().copied().collect();
        let gives_actions = |c: &Card| matches!(c, Card::Village | Card::Festival);
        let non_terminal = |c: &Card| {
            matches!(
                c,
                Card::Village
                    | Card::Festival
                    | Card::Laboratory
                    | Card::Market
                    | Card::Merchant
                    | Card::Poacher
                    | Card::Cellar
                    | Card::Harbinger
                    | Card::Sentry
            )
        };
        DeckAnalysis {
            total_cards: cards.len(),
            terminals: cards.iter().filter(|c| c.is_action() && !non_terminal(c)).count(),
            villages: cards.iter().filter(|c| gives_actions(c)).count(),
        }
    }

    fn game_phase(game: &GameState, player_idx: usize) -> GamePhase {
        let provinces_left = game.supply_count(Card::Province);
        let my_vp = game.players[player_idx].victory_points();
        let best_opponent = (0..game.players.len())
            .filter(|&i| i != player_idx)
            .map(|i| game.players[i].victory_points())
            .max()
            .unwrap_or(0);

        if provinces_left <= 2 || (provinces_left <= 4 && best_opponent > my_vp + 8) {
            GamePhase::Endgame
        } else if provinces_left <= 5 {
            GamePhase::Greening
        } else {
            GamePhase::Building
        }
    }

    /// The best Kingdom card affordable now, respecting a cap on terminals.
    fn best_kingdom_card(game: &GameState, player_idx: usize, coins: u32) -> Option<Card> {
        let deck = Self::analyze_deck(game, player_idx);
        let terminal_cap = 1 + deck.villages + deck.total_cards / 10;
        let owned = |card: Card| game.players[player_idx].all_cards().filter(|c| **c == card).count();

        game.kingdom
            .iter()
            .copied()
            .filter(|&card| card.is_action() && card.cost() <= coins && game.supply_count(card) > 0)
            .filter(|&card| match card {
                Card::Village | Card::Festival => deck.terminals > deck.villages + 1,
                Card::Moneylender | Card::Witch | Card::Mine => owned(card) == 0,
                // Chapel needs a dedicated trashing strategy to pay off.
                Card::Chapel | Card::Moat | Card::Workshop | Card::Bureaucrat | Card::Vassal | Card::Cellar => false,
                Card::Laboratory | Card::Market | Card::Sentry | Card::Merchant | Card::Poacher
                | Card::Harbinger => true,
                _ => deck.terminals < terminal_cap,
            })
            .max_by_key(|&card| gain_value(game, card))
    }

    fn decide_purchase(game: &GameState, player_idx: usize) -> Option<Card> {
        let coins = game.players[player_idx].coins;
        let phase = Self::game_phase(game, player_idx);
        let available = |card: Card| game.supply_count(card) > 0;

        if coins >= 8 && available(Card::Province) {
            return Some(Card::Province);
        }
        if coins >= 5 && phase != GamePhase::Building && available(Card::Duchy) {
            return Some(Card::Duchy);
        }
        if coins >= 6 && phase != GamePhase::Endgame && available(Card::Gold) {
            // A first Witch / Laboratory beats Gold early on.
            if let Some(card) = Self::best_kingdom_card(game, player_idx, coins) {
                if gain_value(game, card) > gain_value(game, Card::Gold) {
                    return Some(card);
                }
            }
            return Some(Card::Gold);
        }
        if phase == GamePhase::Building {
            if let Some(card) = Self::best_kingdom_card(game, player_idx, coins) {
                if gain_value(game, card) >= gain_value(game, Card::Silver) || coins >= 4 {
                    return Some(card);
                }
            }
        }
        if coins >= 3 && available(Card::Silver) {
            return Some(Card::Silver);
        }
        if coins >= 2 && phase == GamePhase::Endgame && available(Card::Estate) {
            return Some(Card::Estate);
        }
        None
    }
}

impl AiPlayer for MediumAi {
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        decide_turn_action(game, player_idx, Self::decide_purchase)
    }

    fn name(&self) -> &str {
        "MediumAi"
    }
}
