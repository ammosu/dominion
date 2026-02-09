use super::AiPlayer;
use crate::shared::{
    action::PlayerAction,
    card::{Card, CardType},
    game::{GameState, TurnPhase},
};

pub struct SimpleAi;

impl SimpleAi {
    pub fn new() -> Self {
        SimpleAi
    }

    /// Check if player has any action cards in hand
    fn has_action_cards(game: &GameState, player_idx: usize) -> bool {
        game.players[player_idx]
            .hand
            .iter()
            .any(|c| c.card_type() == CardType::Action)
    }

    /// Get action cards sorted by priority
    fn get_prioritized_actions(game: &GameState, player_idx: usize) -> Vec<Card> {
        let hand = &game.players[player_idx].hand;
        let mut actions: Vec<Card> = hand
            .iter()
            .filter(|c| c.card_type() == CardType::Action)
            .copied()
            .collect();

        // Sort by priority: Village > Smithy > Market > others
        actions.sort_by_key(|card| match card {
            Card::Village => 0,
            Card::Smithy => 1,
            Card::Market => 2,
            _ => 3,
        });

        actions
    }

    /// Decide action for Cellar card
    fn decide_cellar(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Discard all Victory cards and Curses
        let discards: Vec<Card> = hand
            .iter()
            .filter(|c| {
                c.card_type() == CardType::Victory || c.card_type() == CardType::Curse
            })
            .copied()
            .collect();

        Some(PlayerAction::PlayCellar { discards })
    }

    /// Decide action for Workshop card
    fn decide_workshop(game: &GameState, _player_idx: usize) -> Option<PlayerAction> {
        // Priority: Silver > Estate
        if game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Some(PlayerAction::PlayWorkshop { gain: Card::Silver })
        } else if game.supply.get(&Card::Estate).copied().unwrap_or(0) > 0 {
            Some(PlayerAction::PlayWorkshop { gain: Card::Estate })
        } else {
            None
        }
    }

    /// Decide action for Mine card
    fn decide_mine(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Find lowest value treasure to upgrade
        let trash = if hand.contains(&Card::Copper) {
            Card::Copper
        } else if hand.contains(&Card::Silver) {
            Card::Silver
        } else {
            return None; // No treasures to trash
        };

        // Determine what to gain
        let max_cost = trash.cost() + 3;
        let gain = if max_cost >= 6 && game.supply.get(&Card::Gold).copied().unwrap_or(0) > 0 {
            Card::Gold
        } else if max_cost >= 3 && game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Card::Silver
        } else {
            return None;
        };

        Some(PlayerAction::PlayMine { trash, gain })
    }

    /// Decide action for Remodel card
    fn decide_remodel(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Priority: Trash Curse > Trash lowest cost card
        let trash = if hand.contains(&Card::Curse) {
            Card::Curse
        } else {
            // Find lowest cost card
            hand.iter()
                .min_by_key(|c| c.cost())
                .copied()?
        };

        let max_cost = trash.cost() + 2;

        // Try to gain: Silver (3) > Estate (2)
        let gain = if max_cost >= 3 && game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Card::Silver
        } else if max_cost >= 2 && game.supply.get(&Card::Estate).copied().unwrap_or(0) > 0 {
            Card::Estate
        } else {
            return None;
        };

        Some(PlayerAction::PlayRemodel { trash, gain })
    }

    /// Check if it's late game (Province pile low)
    fn is_late_game(game: &GameState) -> bool {
        game.supply.get(&Card::Province).copied().unwrap_or(0) <= 4
    }

    /// Decide what card to buy based on available coins
    fn decide_purchase(game: &GameState, player_idx: usize) -> Option<Card> {
        let player = &game.players[player_idx];
        let coins = player.coins;
        let is_late = Self::is_late_game(game);

        // Helper to check if card is available
        let available = |card: Card| -> bool {
            game.supply.get(&card).copied().unwrap_or(0) > 0
        };

        // Purchase priority based on coins
        if coins >= 8 && available(Card::Province) {
            Some(Card::Province)
        } else if coins >= 6 && !is_late && available(Card::Gold) {
            Some(Card::Gold)
        } else if coins >= 6 && is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 5 && is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 5 && !is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 3 && available(Card::Silver) {
            Some(Card::Silver)
        } else if coins >= 2 && available(Card::Estate) {
            Some(Card::Estate)
        } else {
            None
        }
    }
}

impl AiPlayer for SimpleAi {
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let player = &game.players[player_idx];

        match game.phase {
            TurnPhase::Action => {
                // If no actions available, end phase
                if player.actions == 0 {
                    return Some(PlayerAction::EndPhase);
                }

                // If no action cards, end phase
                if !Self::has_action_cards(game, player_idx) {
                    return Some(PlayerAction::EndPhase);
                }

                // Get prioritized list of action cards
                let actions = Self::get_prioritized_actions(game, player_idx);

                // Play first available action card
                for card in actions {
                    match card {
                        Card::Cellar => return Self::decide_cellar(game, player_idx),
                        Card::Workshop => return Self::decide_workshop(game, player_idx),
                        Card::Mine => return Self::decide_mine(game, player_idx),
                        Card::Remodel => return Self::decide_remodel(game, player_idx),
                        Card::Militia => return Some(PlayerAction::PlayMilitia),
                        // Simple cards that don't require decisions
                        _ => return Some(PlayerAction::PlayCard { card }),
                    }
                }

                // No valid actions
                Some(PlayerAction::EndPhase)
            }
            TurnPhase::Buy => {
                let player = &game.players[player_idx];

                // First, play all treasure cards if we haven't
                let has_treasures = player.hand.iter().any(|c| c.card_type() == CardType::Treasure);
                if has_treasures {
                    return Some(PlayerAction::PlayAllTreasures);
                }

                // Then try to buy something
                if player.buys > 0 {
                    if let Some(card) = Self::decide_purchase(game, player_idx) {
                        return Some(PlayerAction::BuyCard { card });
                    }
                }

                // No more actions, end turn
                Some(PlayerAction::EndPhase)
            }
            _ => None,
        }
    }

    fn name(&self) -> &str {
        "SimpleAi"
    }
}
