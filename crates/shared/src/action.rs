use serde::{Deserialize, Serialize};

use crate::card::{Card, CardType};
use crate::game::{GameState, TurnPhase};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum PlayerAction {
    PlayCard { card: Card },
    PlayCellar { discards: Vec<Card> },
    PlayWorkshop { gain: Card },
    PlayTreasure { card: Card },
    PlayAllTreasures,
    BuyCard { card: Card },
    EndPhase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionError {
    WrongPhase,
    CardNotInHand,
    NotEnoughActions,
    NotEnoughBuys,
    NotEnoughCoins,
    SupplyEmpty,
    InvalidTarget,
    GameOver,
}

impl std::fmt::Display for ActionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ActionError::WrongPhase => write!(f, "Cannot do that in the current phase"),
            ActionError::CardNotInHand => write!(f, "Card is not in your hand"),
            ActionError::NotEnoughActions => write!(f, "Not enough actions"),
            ActionError::NotEnoughBuys => write!(f, "Not enough buys"),
            ActionError::NotEnoughCoins => write!(f, "Not enough coins"),
            ActionError::SupplyEmpty => write!(f, "Supply pile is empty"),
            ActionError::InvalidTarget => write!(f, "Invalid target for this card"),
            ActionError::GameOver => write!(f, "The game is over"),
        }
    }
}

pub type ActionResult = Result<Vec<String>, ActionError>;

impl GameState {
    pub fn execute(&mut self, action: PlayerAction) -> ActionResult {
        if self.game_over {
            return Err(ActionError::GameOver);
        }

        let result = match action {
            PlayerAction::PlayCard { card } => self.play_action_card(card),
            PlayerAction::PlayCellar { discards } => self.play_cellar(discards),
            PlayerAction::PlayWorkshop { gain } => self.play_workshop(gain),
            PlayerAction::PlayTreasure { card } => self.play_treasure(card),
            PlayerAction::PlayAllTreasures => self.play_all_treasures(),
            PlayerAction::BuyCard { card } => self.buy_card(card),
            PlayerAction::EndPhase => self.end_phase(),
        };

        if let Ok(ref entries) = result {
            self.log.extend(entries.iter().cloned());
        }

        result
    }

    fn play_action_card(&mut self, card: Card) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Action) {
            return Err(ActionError::WrongPhase);
        }

        let player = &self.players[self.current_player];
        if player.actions == 0 {
            return Err(ActionError::NotEnoughActions);
        }
        if card.card_type() != CardType::Action {
            return Err(ActionError::InvalidTarget);
        }

        // Cellar and Workshop have their own endpoints
        if matches!(card, Card::Cellar | Card::Workshop) {
            return Err(ActionError::InvalidTarget);
        }

        let player = &mut self.players[self.current_player];
        let pos = player.hand.iter().position(|c| *c == card);
        let Some(pos) = pos else {
            return Err(ActionError::CardNotInHand);
        };

        player.hand.remove(pos);
        player.discard.push(card);
        player.actions -= 1;

        let name = &self.players[self.current_player].name.clone();
        let mut log = Vec::new();

        match card {
            Card::Smithy => {
                self.players[self.current_player].draw_cards(3);
                log.push(format!("{name} played Smithy, drew 3 cards"));
            }
            Card::Village => {
                self.players[self.current_player].actions += 2;
                self.players[self.current_player].draw_cards(1);
                log.push(format!("{name} played Village, +2 actions, drew 1 card"));
            }
            Card::Market => {
                self.players[self.current_player].actions += 1;
                self.players[self.current_player].buys += 1;
                self.players[self.current_player].coins += 1;
                self.players[self.current_player].draw_cards(1);
                log.push(format!(
                    "{name} played Market, +1 action, +1 buy, +1 coin, drew 1 card"
                ));
            }
            _ => {}
        }

        Ok(log)
    }

    fn play_cellar(&mut self, discards: Vec<Card>) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Action) {
            return Err(ActionError::WrongPhase);
        }

        let player = &self.players[self.current_player];
        if player.actions == 0 {
            return Err(ActionError::NotEnoughActions);
        }

        // Verify Cellar is in hand
        let cellar_pos = player.hand.iter().position(|c| *c == Card::Cellar);
        let Some(cellar_pos) = cellar_pos else {
            return Err(ActionError::CardNotInHand);
        };

        // Verify all discards are in hand (excluding the Cellar itself)
        let mut hand_copy = player.hand.clone();
        hand_copy.remove(cellar_pos);
        for &discard_card in &discards {
            let pos = hand_copy.iter().position(|c| *c == discard_card);
            let Some(pos) = pos else {
                return Err(ActionError::CardNotInHand);
            };
            hand_copy.remove(pos);
        }

        let player = &mut self.players[self.current_player];
        // Remove Cellar from hand
        player.hand.remove(cellar_pos);
        player.discard.push(Card::Cellar);
        player.actions -= 1;

        // Discard selected cards
        let num_discarded = discards.len();
        for discard_card in discards {
            let pos = player.hand.iter().position(|c| *c == discard_card).unwrap();
            player.hand.remove(pos);
            player.discard.push(discard_card);
        }

        // Draw that many
        player.draw_cards(num_discarded);

        let name = &self.players[self.current_player].name.clone();
        Ok(vec![format!(
            "{name} played Cellar, discarded {num_discarded} cards, drew {num_discarded} cards"
        )])
    }

    fn play_workshop(&mut self, gain: Card) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Action) {
            return Err(ActionError::WrongPhase);
        }

        let player = &self.players[self.current_player];
        if player.actions == 0 {
            return Err(ActionError::NotEnoughActions);
        }

        // Verify Workshop is in hand
        let ws_pos = player.hand.iter().position(|c| *c == Card::Workshop);
        let Some(ws_pos) = ws_pos else {
            return Err(ActionError::CardNotInHand);
        };

        // Target must cost 4 or less
        if gain.cost() > 4 {
            return Err(ActionError::InvalidTarget);
        }

        // Check supply
        let supply_count = self.supply.get(&gain).copied().unwrap_or(0);
        if supply_count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        let player = &mut self.players[self.current_player];
        player.hand.remove(ws_pos);
        player.discard.push(Card::Workshop);
        player.actions -= 1;

        // Gain the card to discard pile
        player.discard.push(gain);
        *self.supply.get_mut(&gain).unwrap() -= 1;

        let name = &self.players[self.current_player].name.clone();
        Ok(vec![format!("{name} played Workshop, gained {gain:?}")])
    }

    fn play_treasure(&mut self, card: Card) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Buy) {
            return Err(ActionError::WrongPhase);
        }

        if card.card_type() != CardType::Treasure {
            return Err(ActionError::InvalidTarget);
        }

        let player = &mut self.players[self.current_player];
        let pos = player.hand.iter().position(|c| *c == card);
        let Some(pos) = pos else {
            return Err(ActionError::CardNotInHand);
        };

        player.hand.remove(pos);
        player.discard.push(card);
        player.coins += card.treasure_value();

        let name = player.name.clone();
        Ok(vec![format!(
            "{name} played {card:?} for +{} coin(s)",
            card.treasure_value()
        )])
    }

    fn play_all_treasures(&mut self) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Buy) {
            return Err(ActionError::WrongPhase);
        }

        let player = &mut self.players[self.current_player];
        let treasures: Vec<Card> = player
            .hand
            .iter()
            .filter(|c| c.card_type() == CardType::Treasure)
            .copied()
            .collect();

        let mut total_coins = 0u32;
        for card in &treasures {
            total_coins += card.treasure_value();
            player.discard.push(*card);
        }
        player.hand.retain(|c| c.card_type() != CardType::Treasure);
        player.coins += total_coins;

        let name = player.name.clone();
        Ok(vec![format!(
            "{name} played all treasures for +{total_coins} coin(s)"
        )])
    }

    fn buy_card(&mut self, card: Card) -> ActionResult {
        if !matches!(self.phase, TurnPhase::Buy) {
            return Err(ActionError::WrongPhase);
        }

        let player = &self.players[self.current_player];
        if player.buys == 0 {
            return Err(ActionError::NotEnoughBuys);
        }
        if player.coins < card.cost() {
            return Err(ActionError::NotEnoughCoins);
        }

        let supply_count = self.supply.get(&card).copied().unwrap_or(0);
        if supply_count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        let player = &mut self.players[self.current_player];
        player.coins -= card.cost();
        player.buys -= 1;
        player.discard.push(card);
        *self.supply.get_mut(&card).unwrap() -= 1;

        let name = player.name.clone();
        let mut log = vec![format!("{name} bought {card:?}")];

        // Check game over after buying
        self.check_game_over(&mut log);

        Ok(log)
    }

    fn end_phase(&mut self) -> ActionResult {
        let name = self.players[self.current_player].name.clone();
        let mut log = Vec::new();

        match self.phase {
            TurnPhase::Action => {
                self.phase = TurnPhase::Buy;
                log.push(format!("{name} ended Action phase"));
            }
            TurnPhase::Buy => {
                // Cleanup: discard hand, draw 5, reset counters
                let player = &mut self.players[self.current_player];
                player.discard_hand();
                player.draw_cards(5);
                player.actions = 1;
                player.buys = 1;
                player.coins = 0;

                log.push(format!("{name} ended turn"));

                // Next player
                self.current_player = (self.current_player + 1) % self.players.len();
                self.phase = TurnPhase::Action;

                let next_name = &self.players[self.current_player].name;
                log.push(format!("{next_name}'s turn"));
            }
            TurnPhase::Cleanup => {
                // Shouldn't happen in normal flow, but handle gracefully
                self.phase = TurnPhase::Action;
            }
        }

        Ok(log)
    }

    fn check_game_over(&mut self, log: &mut Vec<String>) {
        let provinces_gone = self.supply.get(&Card::Province).copied().unwrap_or(0) == 0;
        let empty_piles = self.supply.values().filter(|&&count| count == 0).count();

        if provinces_gone || empty_piles >= 3 {
            self.game_over = true;
            log.push("Game over!".to_string());

            // Calculate scores
            for player in &self.players {
                let score: i32 = player
                    .hand
                    .iter()
                    .chain(player.deck.iter())
                    .chain(player.discard.iter())
                    .map(|c| c.victory_points())
                    .sum();
                log.push(format!("{}: {} points", player.name, score));
            }
        }
    }
}
