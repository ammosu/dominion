use super::AiPlayer;
use crate::shared::{
    action::PlayerAction,
    card::{Card, CardType},
    game::{GameState, TurnPhase},
};

pub struct MediumAi;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum GamePhase {
    Building,   // Early game: build economy
    Midgame,    // Mid game: balance money and cards
    Greening,   // Late game: start buying victory cards
    Endgame,    // Final rush: grab all victory points
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Strategy {
    BigMoney,     // Focus on treasure cards
    LightEngine,  // Buy some action cards for draw/efficiency
}

struct DeckAnalysis {
    total_cards: usize,
    treasure_value: u32,
    action_cards: usize,
    victory_cards: usize,
}

impl MediumAi {
    pub fn new() -> Self {
        MediumAi
    }

    /// Analyze player's entire deck composition
    fn analyze_deck(game: &GameState, player_idx: usize) -> DeckAnalysis {
        let player = &game.players[player_idx];

        // Collect all cards from hand, discard, and deck
        let all_cards: Vec<Card> = player.hand.iter()
            .chain(player.discard.iter())
            .chain(player.deck.iter())
            .copied()
            .collect();

        DeckAnalysis {
            total_cards: all_cards.len(),
            treasure_value: all_cards.iter()
                .filter(|c| c.card_type() == CardType::Treasure)
                .map(|c| match c {
                    Card::Copper => 1,
                    Card::Silver => 2,
                    Card::Gold => 3,
                    _ => 0,
                })
                .sum(),
            action_cards: all_cards.iter()
                .filter(|c| c.card_type() == CardType::Action)
                .count(),
            victory_cards: all_cards.iter()
                .filter(|c| matches!(c.card_type(), CardType::Victory | CardType::Curse))
                .count(),
        }
    }

    /// Calculate money density (average coin value per card)
    fn money_density(analysis: &DeckAnalysis) -> f32 {
        if analysis.total_cards == 0 {
            return 0.0;
        }
        analysis.treasure_value as f32 / analysis.total_cards as f32
    }

    /// Determine current game phase based on supply
    fn get_game_phase(game: &GameState, player_idx: usize) -> GamePhase {
        let provinces_left = game.supply.get(&Card::Province).copied().unwrap_or(0);
        let duchies_left = game.supply.get(&Card::Duchy).copied().unwrap_or(0);

        // Calculate victory points (simple estimation)
        let my_vp = Self::estimate_victory_points(game, player_idx);
        let opponent_max_vp = (0..game.players.len())
            .filter(|&i| i != player_idx)
            .map(|i| Self::estimate_victory_points(game, i))
            .max()
            .unwrap_or(0);

        // Endgame: very few provinces or falling behind
        if provinces_left <= 2 || (provinces_left <= 4 && opponent_max_vp > my_vp + 8) {
            return GamePhase::Endgame;
        }

        // Greening: start buying victory cards
        if provinces_left <= 5 || (provinces_left <= 6 && my_vp < opponent_max_vp) {
            return GamePhase::Greening;
        }

        // Building: early game, focus on economy
        if duchies_left >= 8 && provinces_left >= 7 {
            return GamePhase::Building;
        }

        GamePhase::Midgame
    }

    /// Estimate victory points from deck
    fn estimate_victory_points(game: &GameState, player_idx: usize) -> i32 {
        let player = &game.players[player_idx];
        let all_cards: Vec<Card> = player.hand.iter()
            .chain(player.discard.iter())
            .chain(player.deck.iter())
            .copied()
            .collect();

        all_cards.iter()
            .map(|c| match c {
                Card::Estate => 1,
                Card::Duchy => 3,
                Card::Province => 6,
                Card::Curse => -1,
                _ => 0,
            })
            .sum()
    }

    /// Choose overall strategy based on available kingdom cards
    fn choose_strategy(game: &GameState) -> Strategy {
        let has_smithy = game.supply.contains_key(&Card::Smithy);
        let has_market = game.supply.contains_key(&Card::Market);
        let has_village = game.supply.contains_key(&Card::Village);

        // If good draw cards and villages available, try light engine
        if (has_smithy || has_market) && has_village {
            Strategy::LightEngine
        } else {
            Strategy::BigMoney
        }
    }

    /// Decide what card to buy based on strategy and game phase
    fn decide_purchase(game: &GameState, player_idx: usize) -> Option<Card> {
        let player = &game.players[player_idx];
        let coins = player.coins;
        let phase = Self::get_game_phase(game, player_idx);
        let strategy = Self::choose_strategy(game);
        let analysis = Self::analyze_deck(game, player_idx);

        // Helper to check if card is available
        let available = |card: Card| -> bool {
            game.supply.get(&card).copied().unwrap_or(0) > 0
        };

        // Province: always buy if possible
        if coins >= 8 && available(Card::Province) {
            return Some(Card::Province);
        }

        // Duchy: only in greening/endgame phase
        if coins >= 5 && matches!(phase, GamePhase::Greening | GamePhase::Endgame) {
            if available(Card::Duchy) {
                return Some(Card::Duchy);
            }
        }

        // Gold: prioritize in building/midgame
        if coins >= 6 && !matches!(phase, GamePhase::Endgame) {
            if available(Card::Gold) {
                return Some(Card::Gold);
            }
        }

        // Action cards (based on strategy)
        if matches!(strategy, Strategy::LightEngine) && matches!(phase, GamePhase::Building | GamePhase::Midgame) {
            // Limit action cards to avoid deck dilution
            let action_ratio = analysis.action_cards as f32 / analysis.total_cards as f32;

            if action_ratio < 0.3 {  // Don't exceed 30% action cards
                // Market: best action card (draw + action + buy + coin)
                if coins >= 5 && available(Card::Market) {
                    return Some(Card::Market);
                }

                // Smithy: good draw
                if coins >= 4 && available(Card::Smithy) {
                    return Some(Card::Smithy);
                }

                // Village: needed for engine
                if coins >= 3 && available(Card::Village) && analysis.action_cards >= 2 {
                    return Some(Card::Village);
                }
            }
        }

        // Silver: main economy card
        if coins >= 3 && available(Card::Silver) {
            return Some(Card::Silver);
        }

        // Estate: only in desperate endgame
        if coins >= 2 && phase == GamePhase::Endgame {
            let provinces_left = game.supply.get(&Card::Province).copied().unwrap_or(0);
            if provinces_left <= 1 && available(Card::Estate) {
                return Some(Card::Estate);
            }
        }

        None  // Don't waste money on bad purchases
    }

    /// Check if player has action cards
    fn has_action_cards(game: &GameState, player_idx: usize) -> bool {
        game.players[player_idx]
            .hand
            .iter()
            .any(|c| c.card_type() == CardType::Action)
    }

    /// Get prioritized action cards considering terminal/non-terminal
    fn get_prioritized_actions(game: &GameState, player_idx: usize) -> Vec<Card> {
        let player = &game.players[player_idx];
        let hand = &player.hand;
        let actions_left = player.actions;

        let mut actions: Vec<Card> = hand
            .iter()
            .filter(|c| c.card_type() == CardType::Action)
            .copied()
            .collect();

        // If only 1 action left, prioritize terminal draw cards
        if actions_left == 1 {
            actions.sort_by_key(|card| match card {
                Card::Smithy => 0,    // Best terminal draw
                Card::Market => 1,    // +1 Action, so not fully terminal
                Card::Village => 2,   // Save villages for when we have more actions
                _ => 3,
            });
        } else {
            // Multiple actions: play villages first, then draw
            actions.sort_by_key(|card| match card {
                Card::Village => 0,   // +2 Actions, play first
                Card::Market => 1,    // +1 Action + draw
                Card::Smithy => 2,    // Terminal draw
                _ => 3,
            });
        }

        actions
    }

    /// Cellar decision: discard victory cards and curses
    fn decide_cellar(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;
        let phase = Self::get_game_phase(game, player_idx);

        let discards: Vec<Card> = hand
            .iter()
            .filter(|c| {
                // Always discard Curses
                if c.card_type() == CardType::Curse {
                    return true;
                }

                // Discard Victory cards except in endgame
                if c.card_type() == CardType::Victory {
                    return !matches!(phase, GamePhase::Endgame);
                }

                false
            })
            .copied()
            .collect();

        Some(PlayerAction::PlayCellar { discards })
    }

    /// Workshop decision: gain useful cards
    fn decide_workshop(game: &GameState, _player_idx: usize) -> Option<PlayerAction> {
        let available = |card: Card| -> bool {
            game.supply.get(&card).copied().unwrap_or(0) > 0
        };

        // Priority: Silver > Village > Estate
        if available(Card::Silver) {
            Some(PlayerAction::PlayWorkshop { gain: Card::Silver })
        } else if available(Card::Village) {
            Some(PlayerAction::PlayWorkshop { gain: Card::Village })
        } else if available(Card::Estate) {
            Some(PlayerAction::PlayWorkshop { gain: Card::Estate })
        } else {
            None
        }
    }

    /// Mine decision: upgrade treasures
    fn decide_mine(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        let trash = if hand.contains(&Card::Copper) {
            Card::Copper
        } else if hand.contains(&Card::Silver) {
            Card::Silver
        } else {
            return None;
        };

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

    /// Remodel decision: trash bad cards
    fn decide_remodel(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;
        let phase = Self::get_game_phase(game, player_idx);

        // Priority: Curse > Estate (if not endgame) > Copper
        let trash = if hand.contains(&Card::Curse) {
            Card::Curse
        } else if hand.contains(&Card::Estate) && !matches!(phase, GamePhase::Endgame) {
            Card::Estate
        } else if hand.contains(&Card::Copper) {
            Card::Copper
        } else {
            hand.iter().min_by_key(|c| c.cost()).copied()?
        };

        let max_cost = trash.cost() + 2;

        // Try to gain best available card
        let gain = if max_cost >= 5 && game.supply.get(&Card::Market).copied().unwrap_or(0) > 0 {
            Card::Market
        } else if max_cost >= 4 && game.supply.get(&Card::Smithy).copied().unwrap_or(0) > 0 {
            Card::Smithy
        } else if max_cost >= 3 && game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Card::Silver
        } else if max_cost >= 2 && game.supply.get(&Card::Estate).copied().unwrap_or(0) > 0 {
            Card::Estate
        } else {
            return None;
        };

        Some(PlayerAction::PlayRemodel { trash, gain })
    }
}

impl AiPlayer for MediumAi {
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let player = &game.players[player_idx];

        match game.phase {
            TurnPhase::Action => {
                if player.actions == 0 {
                    return Some(PlayerAction::EndPhase);
                }

                if !Self::has_action_cards(game, player_idx) {
                    return Some(PlayerAction::EndPhase);
                }

                let actions = Self::get_prioritized_actions(game, player_idx);

                for card in actions {
                    match card {
                        Card::Cellar => return Self::decide_cellar(game, player_idx),
                        Card::Workshop => return Self::decide_workshop(game, player_idx),
                        Card::Mine => return Self::decide_mine(game, player_idx),
                        Card::Remodel => return Self::decide_remodel(game, player_idx),
                        Card::Militia => return Some(PlayerAction::PlayMilitia),
                        _ => return Some(PlayerAction::PlayCard { card }),
                    }
                }

                Some(PlayerAction::EndPhase)
            }
            TurnPhase::Buy => {
                let player = &game.players[player_idx];

                // Play all treasures first
                let has_treasures = player.hand.iter().any(|c| c.card_type() == CardType::Treasure);
                if has_treasures {
                    return Some(PlayerAction::PlayAllTreasures);
                }

                // Try to buy
                if player.buys > 0 {
                    if let Some(card) = Self::decide_purchase(game, player_idx) {
                        return Some(PlayerAction::BuyCard { card });
                    }
                }

                Some(PlayerAction::EndPhase)
            }
            _ => None,
        }
    }

    fn name(&self) -> &str {
        "MediumAi"
    }
}
