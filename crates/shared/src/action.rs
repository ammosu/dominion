use serde::{Deserialize, Serialize};

use crate::card::Card;
use crate::decision::{Decision, Effect, GainDestination, Purpose};
use crate::event::{GameEvent, Zone};
use crate::game::{GameState, TurnPhase, TurnState};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum PlayerAction {
    PlayCard { card: Card },
    PlayTreasure { card: Card },
    PlayAllTreasures,
    BuyCard { card: Card },
    EndPhase,
    /// Answer the pending decision with a selection from its options.
    Resolve { cards: Vec<Card> },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ActionError {
    WrongPhase,
    NotYourTurn,
    CardNotInHand,
    NotEnoughActions,
    NotEnoughBuys,
    NotEnoughCoins,
    SupplyEmpty,
    NotInSupply,
    InvalidTarget,
    InvalidChoice,
    DecisionPending,
    NoDecisionPending,
    TreasureAfterBuy,
    GameOver,
}

impl std::fmt::Display for ActionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let message = match self {
            ActionError::WrongPhase => "Cannot do that in the current phase",
            ActionError::NotYourTurn => "It is not your turn to act",
            ActionError::CardNotInHand => "Card is not in your hand",
            ActionError::NotEnoughActions => "Not enough actions",
            ActionError::NotEnoughBuys => "Not enough buys",
            ActionError::NotEnoughCoins => "Not enough coins",
            ActionError::SupplyEmpty => "Supply pile is empty",
            ActionError::NotInSupply => "That card is not in the Supply",
            ActionError::InvalidTarget => "Invalid target for this card",
            ActionError::InvalidChoice => "Invalid choice",
            ActionError::DecisionPending => "A choice must be made first",
            ActionError::NoDecisionPending => "There is nothing to choose",
            ActionError::TreasureAfterBuy => "Cannot play Treasures after buying",
            ActionError::GameOver => "The game is over",
        };
        f.write_str(message)
    }
}

impl std::fmt::Display for Card {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Card::CouncilRoom => f.write_str("Council Room"),
            Card::ThroneRoom => f.write_str("Throne Room"),
            other => write!(f, "{other:?}"),
        }
    }
}

/// On success, the log entries the action produced.
pub type ActionResult = Result<Vec<String>, ActionError>;

fn join_cards(cards: &[Card]) -> String {
    cards.iter().map(Card::to_string).collect::<Vec<_>>().join(", ")
}

fn remove_one(cards: &mut Vec<Card>, card: Card) -> bool {
    match cards.iter().position(|c| *c == card) {
        Some(pos) => {
            cards.remove(pos);
            true
        }
        None => false,
    }
}

impl GameState {
    /// Applies `action` on behalf of player `actor`. Either the whole action
    /// (including any effects it triggers) succeeds, or the state is untouched.
    pub fn execute(&mut self, actor: usize, action: PlayerAction) -> ActionResult {
        if self.game_over {
            return Err(ActionError::GameOver);
        }

        let mut next_state = self.clone();
        let log_start = next_state.log.len();
        next_state.execute_in_place(actor, action)?;
        let entries = next_state.log[log_start..].to_vec();
        *self = next_state;
        Ok(entries)
    }

    /// The player who must act next: the owner of a pending decision, or else
    /// the current player.
    pub fn acting_player(&self) -> usize {
        self.pending_decision
            .as_ref()
            .map_or(self.current_player, |d| d.player)
    }

    fn execute_in_place(&mut self, actor: usize, action: PlayerAction) -> Result<(), ActionError> {
        if actor != self.acting_player() {
            return Err(ActionError::NotYourTurn);
        }

        if let Some(decision) = self.pending_decision.take() {
            let PlayerAction::Resolve { cards } = action else {
                return Err(ActionError::DecisionPending);
            };
            if !decision.accepts(&cards) {
                return Err(ActionError::InvalidChoice);
            }
            self.apply_answer(decision, cards);
            self.run_effects();
            return Ok(());
        }

        match action {
            PlayerAction::PlayCard { card } => self.play_action_card(card),
            PlayerAction::PlayTreasure { card } => self.play_treasure_from_hand(card),
            PlayerAction::PlayAllTreasures => self.play_all_treasures(),
            PlayerAction::BuyCard { card } => self.buy_card(card),
            PlayerAction::EndPhase => {
                self.end_phase();
                Ok(())
            }
            PlayerAction::Resolve { .. } => Err(ActionError::NoDecisionPending),
        }
    }

    // ----- logging & small helpers -------------------------------------

    fn note(&mut self, player: usize, message: impl Into<String>) {
        let p = &self.players[player];
        let prefix = if p.is_ai { "[AI] " } else { "" };
        self.log.push(format!("{prefix}{} {}", p.name, message.into()));
    }

    fn emit(&mut self, event: GameEvent) {
        self.events.push(event);
    }

    /// Notes a reshuffle when drawing `n` will run through the deck.
    fn emit_shuffle_before_draw(&mut self, player: usize, n: usize) {
        let p = &self.players[player];
        if n > p.deck.len() && !p.discard.is_empty() {
            self.emit(GameEvent::Shuffle { player });
        }
    }

    fn other_players(&self, player: usize) -> impl Iterator<Item = usize> {
        let n = self.players.len();
        (1..n).map(move |offset| (player + offset) % n)
    }

    fn decide(&mut self, player: usize, source: Card, purpose: Purpose, options: Vec<Card>, min: usize, max: usize) {
        self.pending_decision = Some(Decision {
            player,
            source,
            purpose,
            options,
            min,
            max,
        });
    }

    fn draw(&mut self, player: usize, n: usize) {
        self.emit_shuffle_before_draw(player, n);
        let drawn = self.players[player].draw_cards(n);
        if drawn > 0 {
            self.note(player, format!("draws {drawn} card(s)"));
            self.emit(GameEvent::Draw { player, count: drawn });
        }
    }

    /// Gains `card` from the Supply. Returns false if the pile is empty.
    fn gain(&mut self, player: usize, card: Card, destination: GainDestination) -> bool {
        match self.supply.get_mut(&card) {
            Some(count) if *count > 0 => *count -= 1,
            _ => return false,
        }
        let p = &mut self.players[player];
        match destination {
            GainDestination::Discard => p.discard.push(card),
            GainDestination::Hand => p.hand.push(card),
            GainDestination::DeckTop => p.deck.push(card),
        }
        let suffix = match destination {
            GainDestination::Discard => "",
            GainDestination::Hand => " to hand",
            GainDestination::DeckTop => " onto deck",
        };
        self.note(player, format!("gains {card}{suffix}"));
        let to = match destination {
            GainDestination::Discard => Zone::Discard,
            GainDestination::Hand => Zone::Hand,
            GainDestination::DeckTop => Zone::Deck,
        };
        self.emit(GameEvent::Gain { player, card, to });
        true
    }

    fn offer_gain(&mut self, player: usize, source: Card, max_cost: u32, treasure_only: bool, destination: GainDestination) {
        let mut options: Vec<Card> = self
            .supply
            .iter()
            .filter(|(card, &count)| count > 0 && card.cost() <= max_cost && (!treasure_only || card.is_treasure()))
            .map(|(card, _)| *card)
            .collect();
        if options.is_empty() {
            self.note(player, "has nothing to gain");
            return;
        }
        options.sort_by_key(|card| (card.cost(), *card));
        self.decide(player, source, Purpose::Gain { max_cost, destination }, options, 1, 1);
    }

    fn push_attacks(&mut self, card: Card) {
        let targets: Vec<usize> = self.other_players(self.current_player).collect();
        // Stack: push in reverse so the next player in turn order goes first.
        for target in targets.into_iter().rev() {
            self.effects.push(Effect::Attack { card, target });
        }
    }

    // ----- turn actions --------------------------------------------------

    fn play_action_card(&mut self, card: Card) -> Result<(), ActionError> {
        if self.phase != TurnPhase::Action {
            return Err(ActionError::WrongPhase);
        }
        if !card.is_action() {
            return Err(ActionError::InvalidTarget);
        }
        let p = self.current_player;
        if self.players[p].actions == 0 {
            return Err(ActionError::NotEnoughActions);
        }
        if !self.players[p].remove_from_hand(card) {
            return Err(ActionError::CardNotInHand);
        }
        self.players[p].actions -= 1;
        self.players[p].in_play.push(card);
        self.note(p, format!("plays {card}"));
        self.emit(GameEvent::Play { player: p, cards: vec![card], from: Zone::Hand });
        self.effects.push(Effect::Play(card));
        self.run_effects();
        Ok(())
    }

    fn play_treasure(&mut self, card: Card) -> u32 {
        let p = self.current_player;
        let mut coins = card.treasure_value();
        if card == Card::Silver && !self.turn.silver_played {
            self.turn.silver_played = true;
            coins += self.turn.merchants_played;
        }
        let player = &mut self.players[p];
        player.in_play.push(card);
        player.coins += coins;
        coins
    }

    fn check_can_play_treasure(&self) -> Result<(), ActionError> {
        if self.phase != TurnPhase::Buy {
            return Err(ActionError::WrongPhase);
        }
        if self.turn.has_bought {
            return Err(ActionError::TreasureAfterBuy);
        }
        Ok(())
    }

    fn play_treasure_from_hand(&mut self, card: Card) -> Result<(), ActionError> {
        self.check_can_play_treasure()?;
        if !card.is_treasure() {
            return Err(ActionError::InvalidTarget);
        }
        let p = self.current_player;
        if !self.players[p].remove_from_hand(card) {
            return Err(ActionError::CardNotInHand);
        }
        let coins = self.play_treasure(card);
        self.note(p, format!("plays {card} for +{coins} coin(s)"));
        self.emit(GameEvent::Play { player: p, cards: vec![card], from: Zone::Hand });
        Ok(())
    }

    fn play_all_treasures(&mut self) -> Result<(), ActionError> {
        self.check_can_play_treasure()?;
        let p = self.current_player;
        let (treasures, rest): (Vec<Card>, Vec<Card>) =
            self.players[p].hand.iter().copied().partition(Card::is_treasure);
        self.players[p].hand = rest;
        let total: u32 = treasures.iter().map(|&card| self.play_treasure(card)).sum();
        self.note(p, format!("plays all treasures for +{total} coin(s)"));
        if !treasures.is_empty() {
            self.emit(GameEvent::Play { player: p, cards: treasures, from: Zone::Hand });
        }
        Ok(())
    }

    fn buy_card(&mut self, card: Card) -> Result<(), ActionError> {
        if self.phase != TurnPhase::Buy {
            return Err(ActionError::WrongPhase);
        }
        let p = self.current_player;
        let Some(&count) = self.supply.get(&card) else {
            return Err(ActionError::NotInSupply);
        };
        if self.players[p].buys == 0 {
            return Err(ActionError::NotEnoughBuys);
        }
        if self.players[p].coins < card.cost() {
            return Err(ActionError::NotEnoughCoins);
        }
        if count == 0 {
            return Err(ActionError::SupplyEmpty);
        }

        self.players[p].coins -= card.cost();
        self.players[p].buys -= 1;
        self.turn.has_bought = true;
        self.note(p, format!("buys {card}"));
        self.emit(GameEvent::Buy { player: p, card });
        self.gain(p, card, GainDestination::Discard);
        Ok(())
    }

    fn end_phase(&mut self) {
        let p = self.current_player;
        match self.phase {
            TurnPhase::Action => {
                self.phase = TurnPhase::Buy;
                self.note(p, "ends Action phase");
            }
            TurnPhase::Buy => self.cleanup(),
        }
    }

    /// Clean-up: discard everything, draw 5, then check for game end before
    /// passing the turn (the game only ends at the end of a turn).
    fn cleanup(&mut self) {
        let p = self.current_player;
        self.emit(GameEvent::Cleanup { player: p });
        let player = &mut self.players[p];
        let mut in_play = std::mem::take(&mut player.in_play);
        player.discard.append(&mut in_play);
        player.discard_hand();
        self.emit_shuffle_before_draw(p, 5);
        let player = &mut self.players[p];
        let drawn = player.draw_cards(5);
        player.actions = 1;
        player.buys = 1;
        player.coins = 0;
        player.turns_taken += 1;
        self.turn = TurnState::default();
        self.note(p, "ends turn");
        self.emit(GameEvent::Draw { player: p, count: drawn });

        if self.is_game_over() {
            self.finish_game();
            return;
        }

        self.current_player = (p + 1) % self.players.len();
        self.phase = TurnPhase::Action;
        let next_name = self.players[self.current_player].name.clone();
        self.log.push(format!("{next_name}'s turn"));
        self.emit(GameEvent::TurnStart { player: self.current_player });
    }

    fn finish_game(&mut self) {
        self.game_over = true;
        self.log.push("Game over!".to_string());
        self.emit(GameEvent::GameOver);
        let scores = self.calculate_scores();
        for (name, score) in &scores {
            self.log.push(format!("{name}: {score} points"));
        }
        self.scores = Some(scores);
        self.winners = self.determine_winners();
        self.log.push(format!("Winner: {}", self.winners.join(", ")));
    }

    // ----- effect engine -------------------------------------------------

    fn run_effects(&mut self) {
        while self.pending_decision.is_none() {
            let Some(effect) = self.effects.pop() else {
                break;
            };
            match effect {
                Effect::Play(card) => self.resolve_card(card),
                Effect::Attack { card, target } => self.resolve_attack(card, target),
                Effect::LibraryDraw => self.library_draw(),
                Effect::LibraryDiscardSetAside => {
                    let p = self.current_player;
                    let player = &mut self.players[p];
                    let mut set_aside = std::mem::take(&mut player.set_aside);
                    player.discard.append(&mut set_aside);
                }
                Effect::ArtisanTopdeck => {
                    let p = self.current_player;
                    let hand = self.players[p].hand.clone();
                    if !hand.is_empty() {
                        self.decide(p, Card::Artisan, Purpose::TopdeckFromHand, hand, 1, 1);
                    }
                }
            }
        }
    }

    /// Follows the instructions on `card` for the current player.
    fn resolve_card(&mut self, card: Card) {
        let p = self.current_player;
        match card {
            Card::Artisan => {
                self.effects.push(Effect::ArtisanTopdeck);
                self.offer_gain(p, card, 5, false, GainDestination::Hand);
            }
            Card::Bandit => {
                self.gain(p, Card::Gold, GainDestination::Discard);
                self.push_attacks(card);
            }
            Card::Bureaucrat => {
                self.gain(p, Card::Silver, GainDestination::DeckTop);
                self.push_attacks(card);
            }
            Card::Cellar => {
                self.players[p].actions += 1;
                let hand = self.players[p].hand.clone();
                if !hand.is_empty() {
                    let max = hand.len();
                    self.decide(p, card, Purpose::DiscardToDraw, hand, 0, max);
                }
            }
            Card::Chapel => {
                let hand = self.players[p].hand.clone();
                if !hand.is_empty() {
                    let max = hand.len().min(4);
                    self.decide(p, card, Purpose::TrashFromHand, hand, 0, max);
                }
            }
            Card::CouncilRoom => {
                self.draw(p, 4);
                self.players[p].buys += 1;
                let others: Vec<usize> = self.other_players(p).collect();
                for other in others {
                    self.draw(other, 1);
                }
            }
            Card::Festival => {
                let player = &mut self.players[p];
                player.actions += 2;
                player.buys += 1;
                player.coins += 2;
            }
            Card::Harbinger => {
                self.draw(p, 1);
                self.players[p].actions += 1;
                let discard = self.players[p].discard.clone();
                if !discard.is_empty() {
                    self.decide(p, card, Purpose::TopdeckFromDiscard, discard, 0, 1);
                }
            }
            Card::Laboratory => {
                self.draw(p, 2);
                self.players[p].actions += 1;
            }
            Card::Library => {
                // Stack order: draw first, then discard what was set aside.
                self.effects.push(Effect::LibraryDiscardSetAside);
                self.effects.push(Effect::LibraryDraw);
            }
            Card::Market => {
                self.draw(p, 1);
                let player = &mut self.players[p];
                player.actions += 1;
                player.buys += 1;
                player.coins += 1;
            }
            Card::Merchant => {
                self.draw(p, 1);
                self.players[p].actions += 1;
                self.turn.merchants_played += 1;
            }
            Card::Militia => {
                self.players[p].coins += 2;
                self.push_attacks(card);
            }
            Card::Mine => {
                let treasures: Vec<Card> =
                    self.players[p].hand.iter().copied().filter(Card::is_treasure).collect();
                if !treasures.is_empty() {
                    self.decide(p, card, Purpose::TrashTreasureToMine, treasures, 0, 1);
                }
            }
            Card::Moat => self.draw(p, 2),
            Card::Moneylender => {
                if self.players[p].hand.contains(&Card::Copper) {
                    self.decide(p, card, Purpose::TrashCopper, vec![Card::Copper], 0, 1);
                }
            }
            Card::Poacher => {
                self.draw(p, 1);
                let player = &mut self.players[p];
                player.actions += 1;
                player.coins += 1;
                let to_discard = self.empty_piles().min(self.players[p].hand.len());
                if to_discard > 0 {
                    let hand = self.players[p].hand.clone();
                    self.decide(p, card, Purpose::DiscardPerEmptyPile, hand, to_discard, to_discard);
                }
            }
            Card::Remodel => {
                let hand = self.players[p].hand.clone();
                if !hand.is_empty() {
                    self.decide(p, card, Purpose::TrashToRemodel, hand, 1, 1);
                }
            }
            Card::Sentry => {
                self.draw(p, 1);
                self.players[p].actions += 1;
                let looked = self.players[p].reveal_top(2);
                if !looked.is_empty() {
                    let max = looked.len();
                    self.decide(p, card, Purpose::SentryTrash, looked, 0, max);
                }
            }
            Card::Smithy => self.draw(p, 3),
            Card::ThroneRoom => {
                let actions: Vec<Card> =
                    self.players[p].hand.iter().copied().filter(Card::is_action).collect();
                if !actions.is_empty() {
                    self.decide(p, card, Purpose::PlayTwice, actions, 0, 1);
                }
            }
            Card::Vassal => {
                self.players[p].coins += 2;
                if let Some(top) = self.players[p].take_top_card() {
                    self.players[p].discard.push(top);
                    self.note(p, format!("discards {top}"));
                    self.emit(GameEvent::Discard { player: p, cards: vec![top], from: Zone::Deck });
                    if top.is_action() {
                        self.decide(p, card, Purpose::PlayDiscarded, vec![top], 0, 1);
                    }
                }
            }
            Card::Village => {
                self.draw(p, 1);
                self.players[p].actions += 2;
            }
            Card::Witch => {
                self.draw(p, 2);
                self.push_attacks(card);
            }
            Card::Workshop => self.offer_gain(p, card, 4, false, GainDestination::Discard),
            // Non-Action cards have no on-play instructions.
            _ => {}
        }
    }

    fn resolve_attack(&mut self, card: Card, target: usize) {
        self.emit(GameEvent::Attack { player: self.current_player, card, target });
        // Moat is always revealed when held: it has no downside in this set.
        if self.players[target].hand.contains(&Card::Moat) {
            self.note(target, "reveals Moat and is unaffected");
            self.emit(GameEvent::Blocked { player: target, card });
            return;
        }

        match card {
            Card::Militia => {
                let hand = self.players[target].hand.clone();
                if hand.len() > 3 {
                    let count = hand.len() - 3;
                    self.decide(target, card, Purpose::DiscardDownTo { keep: 3 }, hand, count, count);
                }
            }
            Card::Witch => {
                if !self.gain(target, Card::Curse, GainDestination::Discard) {
                    self.note(target, "gains no Curse (pile empty)");
                }
            }
            Card::Bureaucrat => {
                let mut victories: Vec<Card> =
                    self.players[target].hand.iter().copied().filter(Card::is_victory).collect();
                victories.sort();
                victories.dedup();
                match victories.as_slice() {
                    [] => {
                        let hand = join_cards(&self.players[target].hand);
                        self.note(target, format!("reveals a hand with no Victory cards: {hand}"));
                    }
                    [only] => self.topdeck_from_hand(target, *only),
                    _ => self.decide(target, card, Purpose::TopdeckVictory, victories, 1, 1),
                }
            }
            Card::Bandit => {
                let revealed = self.players[target].reveal_top(2);
                if revealed.is_empty() {
                    return;
                }
                self.note(target, format!("reveals {}", join_cards(&revealed)));
                let mut candidates: Vec<Card> = revealed
                    .iter()
                    .copied()
                    .filter(|c| c.is_treasure() && *c != Card::Copper)
                    .collect();
                candidates.sort();
                candidates.dedup();
                match candidates.as_slice() {
                    [] => self.trash_revealed(target, revealed, None),
                    [only] => self.trash_revealed(target, revealed, Some(*only)),
                    _ => self.decide(
                        target,
                        card,
                        Purpose::TrashRevealedTreasure { revealed },
                        candidates,
                        1,
                        1,
                    ),
                }
            }
            _ => {}
        }
    }

    fn topdeck_from_hand(&mut self, player: usize, card: Card) {
        if self.players[player].remove_from_hand(card) {
            self.players[player].deck.push(card);
            self.note(player, format!("puts {card} onto their deck"));
            self.emit(GameEvent::Topdeck { player, cards: vec![card], from: Zone::Hand });
        }
    }

    fn trash_revealed(&mut self, player: usize, mut revealed: Vec<Card>, trashed: Option<Card>) {
        if let Some(card) = trashed {
            if remove_one(&mut revealed, card) {
                self.trash.push(card);
                self.note(player, format!("trashes {card}"));
                self.emit(GameEvent::Trash { player, cards: vec![card], from: Zone::Deck });
            }
        }
        if !revealed.is_empty() {
            self.note(player, format!("discards {}", join_cards(&revealed)));
            self.emit(GameEvent::Discard { player, cards: revealed.clone(), from: Zone::Deck });
            self.players[player].discard.append(&mut revealed);
        }
    }

    fn library_draw(&mut self) {
        let p = self.current_player;
        let mut drawn = 0;
        while self.players[p].hand.len() < 7 {
            self.emit_shuffle_before_draw(p, 1);
            let Some(card) = self.players[p].draw_one() else {
                break;
            };
            drawn += 1;
            if card.is_action() {
                self.emit(GameEvent::Draw { player: p, count: drawn });
                self.effects.push(Effect::LibraryDraw);
                self.decide(p, Card::Library, Purpose::SetAside, vec![card], 0, 1);
                return;
            }
        }
        if drawn > 0 {
            self.emit(GameEvent::Draw { player: p, count: drawn });
        }
        self.note(p, format!("draws up to {} cards", self.players[p].hand.len()));
    }

    /// Applies a validated answer to `decision`.
    fn apply_answer(&mut self, decision: Decision, chosen: Vec<Card>) {
        let p = decision.player;
        let source = decision.source;
        match decision.purpose {
            Purpose::DiscardToDraw => {
                self.discard_from_hand(p, &chosen);
                self.draw(p, chosen.len());
            }
            Purpose::DiscardDownTo { .. } | Purpose::DiscardPerEmptyPile => {
                self.discard_from_hand(p, &chosen);
            }
            Purpose::TrashFromHand => self.trash_from_hand(p, &chosen),
            Purpose::TopdeckFromDiscard => {
                if let Some(&card) = chosen.first() {
                    remove_one(&mut self.players[p].discard, card);
                    self.players[p].deck.push(card);
                    self.note(p, format!("puts {card} from discard onto their deck"));
                    self.emit(GameEvent::Topdeck { player: p, cards: vec![card], from: Zone::Discard });
                }
            }
            Purpose::PlayDiscarded => {
                if let Some(&card) = chosen.first() {
                    let discard = &mut self.players[p].discard;
                    if let Some(pos) = discard.iter().rposition(|c| *c == card) {
                        discard.remove(pos);
                        self.players[p].in_play.push(card);
                        self.note(p, format!("plays {card}"));
                        self.emit(GameEvent::Play { player: p, cards: vec![card], from: Zone::Discard });
                        self.effects.push(Effect::Play(card));
                    }
                }
            }
            Purpose::Gain { destination, .. } => {
                if let Some(&card) = chosen.first() {
                    self.gain(p, card, destination);
                }
            }
            Purpose::TopdeckVictory | Purpose::TopdeckFromHand => {
                if let Some(&card) = chosen.first() {
                    self.topdeck_from_hand(p, card);
                }
            }
            Purpose::TrashCopper => {
                if !chosen.is_empty() {
                    self.trash_from_hand(p, &chosen);
                    self.players[p].coins += 3;
                }
            }
            Purpose::TrashToRemodel => {
                if let Some(&card) = chosen.first() {
                    self.trash_from_hand(p, &chosen);
                    self.offer_gain(p, source, card.cost() + 2, false, GainDestination::Discard);
                }
            }
            Purpose::TrashTreasureToMine => {
                if let Some(&card) = chosen.first() {
                    self.trash_from_hand(p, &chosen);
                    self.offer_gain(p, source, card.cost() + 3, true, GainDestination::Hand);
                }
            }
            Purpose::PlayTwice => {
                if let Some(&card) = chosen.first() {
                    self.players[p].remove_from_hand(card);
                    self.players[p].in_play.push(card);
                    self.note(p, format!("plays {card} twice"));
                    self.emit(GameEvent::Play { player: p, cards: vec![card], from: Zone::Hand });
                    self.effects.push(Effect::Play(card));
                    self.effects.push(Effect::Play(card));
                }
            }
            Purpose::TrashRevealedTreasure { revealed } => {
                self.trash_revealed(p, revealed, chosen.first().copied());
            }
            Purpose::SetAside => {
                if let Some(&card) = chosen.first() {
                    self.players[p].remove_from_hand(card);
                    self.players[p].set_aside.push(card);
                    self.note(p, format!("sets aside {card}"));
                }
            }
            Purpose::SentryTrash => {
                let mut remaining = decision.options;
                for &card in &chosen {
                    remove_one(&mut remaining, card);
                    self.trash.push(card);
                }
                if !chosen.is_empty() {
                    self.note(p, format!("trashes {}", join_cards(&chosen)));
                    self.emit(GameEvent::Trash { player: p, cards: chosen.clone(), from: Zone::Deck });
                }
                if !remaining.is_empty() {
                    let max = remaining.len();
                    self.decide(p, source, Purpose::SentryDiscard, remaining, 0, max);
                }
            }
            Purpose::SentryDiscard => {
                let mut remaining = decision.options;
                for &card in &chosen {
                    remove_one(&mut remaining, card);
                    self.players[p].discard.push(card);
                }
                if !chosen.is_empty() {
                    self.note(p, format!("discards {}", join_cards(&chosen)));
                    self.emit(GameEvent::Discard { player: p, cards: chosen.clone(), from: Zone::Deck });
                }
                match remaining.as_slice() {
                    [a, b] if a != b => {
                        self.decide(p, source, Purpose::SentryTopCard, remaining, 1, 1);
                    }
                    _ => self.players[p].deck.extend(remaining),
                }
            }
            Purpose::SentryTopCard => {
                let top = chosen[0];
                let mut rest = decision.options;
                remove_one(&mut rest, top);
                self.players[p].deck.extend(rest);
                self.players[p].deck.push(top);
            }
        }
    }

    fn discard_from_hand(&mut self, player: usize, cards: &[Card]) {
        for &card in cards {
            if self.players[player].remove_from_hand(card) {
                self.players[player].discard.push(card);
            }
        }
        if !cards.is_empty() {
            self.note(player, format!("discards {}", join_cards(cards)));
            self.emit(GameEvent::Discard { player, cards: cards.to_vec(), from: Zone::Hand });
        }
    }

    fn trash_from_hand(&mut self, player: usize, cards: &[Card]) {
        for &card in cards {
            if self.players[player].remove_from_hand(card) {
                self.trash.push(card);
            }
        }
        if !cards.is_empty() {
            self.note(player, format!("trashes {}", join_cards(cards)));
            self.emit(GameEvent::Trash { player, cards: cards.to_vec(), from: Zone::Hand });
        }
    }
}

#[cfg(test)]
mod tests;
