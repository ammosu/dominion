use serde::{Deserialize, Serialize};

use crate::card::{Card, CardType};
use crate::game::{GameState, TurnPhase};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum PlayerAction {
    PlayCard { card: Card },
    PlayCellar { discards: Vec<Card> },
    PlayWorkshop { gain: Card },
    PlayMilitia,
    PlayMine { trash: Card, gain: Card },
    PlayRemodel { trash: Card, gain: Card },
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

        let mut next_state = self.clone();
        let entries = next_state.execute_in_place(action)?;
        *self = next_state;
        Ok(entries)
    }

    fn execute_in_place(&mut self, action: PlayerAction) -> ActionResult {
        let is_ai = self.players[self.current_player].is_ai;
        let old_phase = self.phase.clone();
        let old_player = self.current_player;

        let entries = match action {
            PlayerAction::PlayCard { card } => self.play_action_card(card),
            PlayerAction::PlayCellar { discards } => self.play_cellar(discards),
            PlayerAction::PlayWorkshop { gain } => self.play_workshop(gain),
            PlayerAction::PlayMilitia => self.play_militia(),
            PlayerAction::PlayMine { trash, gain } => self.play_mine(trash, gain),
            PlayerAction::PlayRemodel { trash, gain } => self.play_remodel(trash, gain),
            PlayerAction::PlayTreasure { card } => self.play_treasure(card),
            PlayerAction::PlayAllTreasures => self.play_all_treasures(),
            PlayerAction::BuyCard { card } => self.buy_card(card),
            PlayerAction::EndPhase => self.end_phase(),
        }?;

        let prefixed_entries: Vec<String> = entries
            .iter()
            .map(|entry| {
                if is_ai {
                    format!("[AI] {entry}")
                } else {
                    entry.clone()
                }
            })
            .collect();
        self.log.extend(prefixed_entries);

        if matches!(old_phase, TurnPhase::Buy)
            && matches!(self.phase, TurnPhase::Action)
            && old_player != self.current_player
        {
            let next_name = &self.players[self.current_player].name;
            self.log.push(format!("{next_name}'s turn"));
        }

        Ok(entries)
    }

    fn require_action_phase(&self) -> Result<(), ActionError> {
        if !matches!(self.phase, TurnPhase::Action) {
            return Err(ActionError::WrongPhase);
        }
        if self.players[self.current_player].actions == 0 {
            return Err(ActionError::NotEnoughActions);
        }
        Ok(())
    }

    fn remove_action_from_hand(&mut self, card: Card) -> Result<(), ActionError> {
        let player = &mut self.players[self.current_player];
        let pos = player.hand.iter().position(|c| *c == card);
        let Some(pos) = pos else {
            return Err(ActionError::CardNotInHand);
        };
        player.hand.remove(pos);
        player.in_play.push(card);  // Put in play area, not discard!
        player.actions -= 1;
        Ok(())
    }

    fn play_action_card(&mut self, card: Card) -> ActionResult {
        self.require_action_phase()?;

        if card.card_type() != CardType::Action {
            return Err(ActionError::InvalidTarget);
        }

        // Cards with special parameters have their own endpoints
        if matches!(
            card,
            Card::Cellar | Card::Workshop | Card::Militia | Card::Mine | Card::Remodel
        ) {
            return Err(ActionError::InvalidTarget);
        }

        self.remove_action_from_hand(card)?;

        let name = self.players[self.current_player].name.clone();
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
            Card::Moat => {
                self.players[self.current_player].draw_cards(2);
                log.push(format!("{name} played Moat, drew 2 cards"));
            }
            Card::Woodcutter => {
                self.players[self.current_player].buys += 1;
                self.players[self.current_player].coins += 2;
                log.push(format!("{name} played Woodcutter, +1 buy, +2 coins"));
            }
            _ => {}
        }

        Ok(log)
    }

    fn play_cellar(&mut self, discards: Vec<Card>) -> ActionResult {
        self.require_action_phase()?;

        let player = &self.players[self.current_player];

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

        // Cellar gives +1 Action, so net effect on actions is 0
        let player = &mut self.players[self.current_player];
        player.hand.remove(cellar_pos);
        player.discard.push(Card::Cellar);
        // Cellar: +1 Action (so we don't decrement — spend 1, gain 1)

        // Discard selected cards
        let num_discarded = discards.len();
        for discard_card in discards {
            let pos = player.hand.iter().position(|c| *c == discard_card).unwrap();
            player.hand.remove(pos);
            player.discard.push(discard_card);
        }

        // Draw that many
        player.draw_cards(num_discarded);

        let name = self.players[self.current_player].name.clone();
        Ok(vec![format!(
            "{name} played Cellar, discarded {num_discarded}, drew {num_discarded}"
        )])
    }

    fn play_workshop(&mut self, gain: Card) -> ActionResult {
        self.require_action_phase()?;

        // Verify Workshop is in hand
        let player = &self.players[self.current_player];
        if !player.hand.contains(&Card::Workshop) {
            return Err(ActionError::CardNotInHand);
        }

        if gain.cost() > 4 {
            return Err(ActionError::InvalidTarget);
        }

        let supply_count = self.supply.get(&gain).copied().unwrap_or(0);
        if supply_count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        self.remove_action_from_hand(Card::Workshop)?;

        // Gain the card to discard pile
        self.players[self.current_player].discard.push(gain);
        *self.supply.get_mut(&gain).unwrap() -= 1;

        let name = self.players[self.current_player].name.clone();
        Ok(vec![format!("{name} played Workshop, gained {gain:?}")])
    }

    fn play_militia(&mut self) -> ActionResult {
        self.require_action_phase()?;

        let player = &self.players[self.current_player];
        if !player.hand.contains(&Card::Militia) {
            return Err(ActionError::CardNotInHand);
        }

        self.remove_action_from_hand(Card::Militia)?;
        self.players[self.current_player].coins += 2;

        let name = self.players[self.current_player].name.clone();
        let mut log = vec![format!("{name} played Militia, +2 coins")];

        // Attack each other player
        let num_players = self.players.len();
        for i in 0..num_players {
            if i == self.current_player {
                continue;
            }

            let other = &self.players[i];

            // Check if they have Moat in hand (auto-reveal)
            if other.hand.contains(&Card::Moat) {
                log.push(format!("{} reveals Moat, unaffected", other.name));
                continue;
            }

            if other.hand.len() <= 3 {
                continue; // Already at 3 or fewer
            }

            let other_name = other.name.clone();
            let discard_count = other.hand.len() - 3;

            // Auto-discard: sort by "discard priority" (lowest value first)
            let mut indices_with_priority: Vec<(usize, u32)> = self.players[i]
                .hand
                .iter()
                .enumerate()
                .map(|(idx, card)| {
                    let priority = match card.card_type() {
                        CardType::Curse => 0,   // Discard first
                        CardType::Treasure => card.treasure_value() + 10, // Keep treasures
                        CardType::Victory => card.victory_points() as u32 + 5, // Mid priority
                        CardType::Action => card.cost() + 20,  // Keep actions
                    };
                    (idx, priority)
                })
                .collect();

            // Sort by priority ascending (lowest priority = discard first)
            indices_with_priority.sort_by_key(|&(_, p)| p);

            // Take the first `discard_count` indices to discard
            let mut to_discard: Vec<usize> =
                indices_with_priority[..discard_count].iter().map(|&(i, _)| i).collect();
            // Sort indices descending so removal doesn't shift earlier indices
            to_discard.sort_unstable_by(|a, b| b.cmp(a));

            let mut discarded_names = Vec::new();
            for idx in to_discard {
                let card = self.players[i].hand.remove(idx);
                discarded_names.push(format!("{card:?}"));
                self.players[i].discard.push(card);
            }

            log.push(format!(
                "{other_name} discards {}",
                discarded_names.join(", ")
            ));
        }

        Ok(log)
    }

    fn play_mine(&mut self, trash: Card, gain: Card) -> ActionResult {
        self.require_action_phase()?;

        let player = &self.players[self.current_player];
        if !player.hand.contains(&Card::Mine) {
            return Err(ActionError::CardNotInHand);
        }

        // Must trash a Treasure from hand
        if trash.card_type() != CardType::Treasure {
            return Err(ActionError::InvalidTarget);
        }
        if !player.hand.contains(&trash) {
            return Err(ActionError::CardNotInHand);
        }

        // Must gain a Treasure costing up to 3 more
        if gain.card_type() != CardType::Treasure {
            return Err(ActionError::InvalidTarget);
        }
        if gain.cost() > trash.cost() + 3 {
            return Err(ActionError::InvalidTarget);
        }

        let supply_count = self.supply.get(&gain).copied().unwrap_or(0);
        if supply_count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        // Remove Mine from hand (discard it, costs 1 action)
        self.remove_action_from_hand(Card::Mine)?;

        // Trash the treasure
        let player = &mut self.players[self.current_player];
        let pos = player.hand.iter().position(|c| *c == trash).unwrap();
        player.hand.remove(pos);
        self.trash.push(trash);

        // Gain the new treasure TO HAND (not discard!)
        self.players[self.current_player].hand.push(gain);
        *self.supply.get_mut(&gain).unwrap() -= 1;

        let name = self.players[self.current_player].name.clone();
        Ok(vec![format!(
            "{name} played Mine, trashed {trash:?}, gained {gain:?} to hand"
        )])
    }

    fn play_remodel(&mut self, trash: Card, gain: Card) -> ActionResult {
        self.require_action_phase()?;

        let player = &self.players[self.current_player];
        if !player.hand.contains(&Card::Remodel) {
            return Err(ActionError::CardNotInHand);
        }
        let matching_cards = player.hand.iter().filter(|&&card| card == trash).count();
        let required_matches = if trash == Card::Remodel { 2 } else { 1 };
        if matching_cards < required_matches {
            return Err(ActionError::CardNotInHand);
        }

        // Gain card must cost up to 2 more than trashed card
        if gain.cost() > trash.cost() + 2 {
            return Err(ActionError::InvalidTarget);
        }

        let supply_count = self.supply.get(&gain).copied().unwrap_or(0);
        if supply_count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        // Remove Remodel from hand
        self.remove_action_from_hand(Card::Remodel)?;

        // Trash the chosen card from hand
        let player = &mut self.players[self.current_player];
        let pos = player.hand.iter().position(|c| *c == trash);
        let Some(pos) = pos else {
            return Err(ActionError::CardNotInHand);
        };
        player.hand.remove(pos);
        self.trash.push(trash);

        // Gain the new card to discard
        self.players[self.current_player].discard.push(gain);
        *self.supply.get_mut(&gain).unwrap() -= 1;

        let name = self.players[self.current_player].name.clone();
        Ok(vec![format!(
            "{name} played Remodel, trashed {trash:?}, gained {gain:?}"
        )])
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
        player.in_play.push(card);  // Put in play area, not discard!
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
            player.in_play.push(*card);  // Put in play area, not discard!
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
                let player = &mut self.players[self.current_player];
                // Move cards from in_play to discard (Cleanup phase)
                player.discard.append(&mut player.in_play);
                player.discard_hand();
                player.draw_cards(5);
                player.actions = 1;
                player.buys = 1;
                player.coins = 0;

                log.push(format!("{name} ended turn"));

                self.current_player = (self.current_player + 1) % self.players.len();
                self.phase = TurnPhase::Action;

                // Note: The "{name}'s turn" message is now added in execute()
                // after AI prefix handling, so it doesn't get the [AI] prefix
            }
            TurnPhase::Cleanup => {
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

            let scores = self.calculate_scores();
            for (name, score) in &scores {
                log.push(format!("{}: {} points", name, score));
            }
            self.scores = Some(scores);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::PlayerInfo;

    fn game_with_hand(hand: Vec<Card>) -> GameState {
        let mut game = GameState::new(vec![
            PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ]);

        let player = &mut game.players[0];
        player.hand = hand;
        player.deck.clear();
        player.discard.clear();
        player.in_play.clear();
        player.actions = 1;
        player.buys = 1;
        player.coins = 0;

        game.current_player = 0;
        game.phase = TurnPhase::Action;
        game.trash.clear();
        game.game_over = false;
        game.log.clear();
        game.scores = None;
        game
    }

    #[test]
    fn valid_remodel_moves_all_cards_and_consumes_one_action() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Estate]);
        let silver_before = game.supply[&Card::Silver];

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Estate,
            gain: Card::Silver,
        });

        assert!(result.is_ok());
        assert!(game.players[0].hand.is_empty());
        assert_eq!(game.players[0].in_play, vec![Card::Remodel]);
        assert_eq!(game.players[0].discard, vec![Card::Silver]);
        assert_eq!(game.trash, vec![Card::Estate]);
        assert_eq!(game.players[0].actions, 0);
        assert_eq!(game.supply[&Card::Silver], silver_before - 1);
        assert_eq!(game.log.len(), 1);
    }

    #[test]
    fn two_remodels_allow_playing_one_and_trashing_the_other() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Remodel]);

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Remodel,
            gain: Card::Silver,
        });

        assert!(result.is_ok());
        assert!(game.players[0].hand.is_empty());
        assert_eq!(game.players[0].in_play, vec![Card::Remodel]);
        assert_eq!(game.trash, vec![Card::Remodel]);
        assert_eq!(game.players[0].discard, vec![Card::Silver]);
        assert_eq!(game.players[0].actions, 0);
    }

    #[test]
    fn failed_remodel_is_atomic_when_target_is_missing() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Copper]);
        let before = serde_json::to_value(&game).expect("serialize state before action");

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Estate,
            gain: Card::Silver,
        });

        assert!(matches!(result, Err(ActionError::CardNotInHand)));
        assert_eq!(
            serde_json::to_value(&game).expect("serialize state after action"),
            before
        );
    }

    #[test]
    fn single_remodel_cannot_trash_itself_and_state_is_unchanged() {
        let mut game = game_with_hand(vec![Card::Remodel]);
        let before = serde_json::to_value(&game).expect("serialize state before action");

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Remodel,
            gain: Card::Silver,
        });

        assert!(matches!(result, Err(ActionError::CardNotInHand)));
        assert_eq!(
            serde_json::to_value(&game).expect("serialize state after action"),
            before
        );
    }
}
