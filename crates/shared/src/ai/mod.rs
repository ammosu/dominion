use crate::{
    action::PlayerAction,
    card::Card,
    decision::{Decision, Purpose},
    game::{GameState, TurnPhase},
};

pub mod medium;
pub mod simple;

/// Trait for AI player decision making
pub trait AiPlayer: Send + Sync {
    /// Decide the next turn action for the AI player.
    /// Returns None if no valid action is available (should end phase)
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction>;

    /// Answer a decision addressed to this AI (own card or an opponent's
    /// attack). The answer must be acceptable to `decision.accepts`.
    fn resolve(&self, game: &GameState, decision: &Decision) -> Vec<Card> {
        resolve_decision(game, decision)
    }

    /// Get the name/identifier of this AI
    fn name(&self) -> &str;
}

/// Both AIs play their turn the same way; they differ in what they buy.
pub fn decide_turn_action(
    game: &GameState,
    player_idx: usize,
    purchase: impl Fn(&GameState, usize) -> Option<Card>,
) -> Option<PlayerAction> {
    let player = &game.players[player_idx];
    match game.phase {
        TurnPhase::Action => {
            if player.actions == 0 {
                return Some(PlayerAction::EndPhase);
            }
            match best_action_to_play(game, player_idx) {
                Some(card) => Some(PlayerAction::PlayCard { card }),
                None => Some(PlayerAction::EndPhase),
            }
        }
        TurnPhase::Buy => {
            if !game.turn.has_bought && player.hand.iter().any(Card::is_treasure) {
                return Some(PlayerAction::PlayAllTreasures);
            }
            if player.buys > 0 {
                if let Some(card) = purchase(game, player_idx) {
                    return Some(PlayerAction::BuyCard { card });
                }
            }
            Some(PlayerAction::EndPhase)
        }
    }
}

/// Lets AI players act until a human must act (or the game ends). The cap is
/// only a safety net against engine bugs, not a gameplay limit.
pub fn run_ai_turns(game: &mut GameState, ai: &dyn AiPlayer) {
    for _ in 0..1000 {
        if game.game_over {
            return;
        }
        let actor = game.acting_player();
        if !game.players[actor].is_ai {
            return;
        }
        if let Some(decision) = game.pending_decision.clone() {
            let answer = ai.resolve(game, &decision);
            if let Err(e) = game.execute(actor, PlayerAction::Resolve { cards: answer }) {
                eprintln!("AI answer rejected ({e}); using fallback");
                let fallback = decision.options[..decision.min].to_vec();
                game.execute(actor, PlayerAction::Resolve { cards: fallback })
                    .expect("minimal answer is always valid");
            }
        } else {
            let action = ai.decide_action(game, actor).unwrap_or(PlayerAction::EndPhase);
            if let Err(e) = game.execute(actor, action) {
                eprintln!("AI action rejected ({e}); ending phase");
                let _ = game.execute(actor, PlayerAction::EndPhase);
            }
        }
    }
    eprintln!("AI exceeded its action budget");
}

pub fn is_late_game(game: &GameState) -> bool {
    game.supply_count(Card::Province) <= 3
}

/// Non-terminal cards (that give back an action) are played before terminals.
fn gives_action(card: Card) -> bool {
    matches!(
        card,
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
}

fn play_priority(card: Card) -> u32 {
    match card {
        Card::Festival | Card::Village => 0,
        Card::Laboratory | Card::Market => 1,
        Card::Sentry | Card::Merchant | Card::Poacher | Card::Harbinger => 2,
        Card::Cellar => 3,
        Card::ThroneRoom => 10,
        Card::Witch => 11,
        Card::Library | Card::CouncilRoom => 12,
        Card::Smithy => 13,
        Card::Militia | Card::Bandit => 14,
        Card::Artisan | Card::Mine => 15,
        Card::Moneylender | Card::Remodel => 16,
        Card::Workshop | Card::Bureaucrat | Card::Vassal => 17,
        Card::Moat | Card::Chapel => 18,
        _ => 99,
    }
}

fn best_action_to_play(game: &GameState, player_idx: usize) -> Option<Card> {
    let player = &game.players[player_idx];
    let actions: Vec<Card> = player.hand.iter().copied().filter(Card::is_action).collect();
    actions
        .iter()
        .copied()
        .filter(|&card| match card {
            // Throne Room is only worth playing with another Action to double.
            Card::ThroneRoom => actions.iter().filter(|c| **c != Card::ThroneRoom).count() > 0,
            Card::Moneylender => player.hand.contains(&Card::Copper),
            Card::Mine => player.hand.iter().any(Card::is_treasure),
            Card::Library => player.hand.len() < 7,
            _ => true,
        })
        .min_by_key(|&card| (if gives_action(card) { 0 } else { 1 }, play_priority(card)))
}

/// How much a card in hand is worth keeping right now (low = discard first).
fn keep_value(card: Card) -> i32 {
    match card {
        Card::Curse => -2,
        c if c.is_victory() => -1,
        Card::Copper => 1,
        Card::Silver => 3,
        Card::Gold => 5,
        c => c.cost() as i32,
    }
}

/// How desirable it is to gain `card`; negative means "never".
pub fn gain_value(game: &GameState, card: Card) -> i32 {
    let late = is_late_game(game);
    match card {
        Card::Curse => -100,
        Card::Copper => -10,
        Card::Province => 100,
        Card::Duchy => if late { 70 } else { -5 },
        Card::Estate => if game.supply_count(Card::Province) <= 2 { 40 } else { -8 },
        Card::Gardens => if late { 30 } else { -4 },
        Card::Gold => 60,
        Card::Artisan => 52,
        Card::Witch => 62, // the strongest card in the base set
        Card::Laboratory => 55,
        Card::Market | Card::Festival => 50,
        Card::Sentry | Card::Library | Card::CouncilRoom => 48,
        Card::Smithy | Card::Militia | Card::Bandit => 45,
        Card::Mine => 40,
        Card::Silver => 35,
        Card::Merchant | Card::Poacher | Card::Village => 33,
        c => c.cost() as i32 * 6,
    }
}

fn lowest_keep_value(options: &[Card], count: usize) -> Vec<Card> {
    let mut sorted = options.to_vec();
    sorted.sort_by_key(|&c| keep_value(c));
    sorted.truncate(count);
    sorted
}

fn is_junk(game: &GameState, card: Card) -> bool {
    match card {
        Card::Curse => true,
        Card::Estate => !is_late_game(game),
        _ => false,
    }
}

/// A reasonable answer to any decision.
pub fn resolve_decision(game: &GameState, decision: &Decision) -> Vec<Card> {
    let options = &decision.options;
    let player = &game.players[decision.player];
    let best = |cards: &[Card]| cards.iter().copied().max_by_key(|&c| gain_value(game, c));

    let chosen: Vec<Card> = match &decision.purpose {
        Purpose::DiscardToDraw => options.iter().copied().filter(|c| c.is_victory() || *c == Card::Curse).collect(),
        Purpose::TrashFromHand => {
            let coppers_to_keep = if player.all_cards().filter(|c| c.is_treasure()).count() > 7 { 0 } else { 99 };
            let mut picks: Vec<Card> = options.iter().copied().filter(|&c| is_junk(game, c)).collect();
            if coppers_to_keep == 0 {
                picks.extend(options.iter().copied().filter(|c| *c == Card::Copper));
            }
            picks.truncate(decision.max);
            picks
        }
        Purpose::TopdeckFromDiscard => best(options)
            .filter(|&c| gain_value(game, c) >= 35)
            .into_iter()
            .collect(),
        Purpose::PlayDiscarded | Purpose::TrashCopper => options.clone(),
        Purpose::Gain { .. } => {
            let mut ranked = options.clone();
            ranked.sort_by_key(|&c| -gain_value(game, c));
            ranked.into_iter().take(1).collect()
        }
        Purpose::TopdeckVictory | Purpose::TrashRevealedTreasure { .. } => {
            // Topdeck the cheapest Victory card; let Bandit take the weakest Treasure.
            options.iter().copied().min_by_key(|c| c.cost()).into_iter().collect()
        }
        Purpose::DiscardDownTo { .. } | Purpose::DiscardPerEmptyPile => lowest_keep_value(options, decision.min),
        Purpose::TrashToRemodel => {
            let pick = options
                .iter()
                .copied()
                .find(|&c| c == Card::Curse)
                .or_else(|| options.iter().copied().find(|&c| c == Card::Gold && is_late_game(game)))
                .or_else(|| options.iter().copied().find(|&c| is_junk(game, c)))
                .or_else(|| options.iter().copied().min_by_key(|&c| keep_value(c)));
            pick.into_iter().collect()
        }
        Purpose::TrashTreasureToMine => {
            let pick = if options.contains(&Card::Silver) && game.supply_count(Card::Gold) > 0 {
                Some(Card::Silver)
            } else if options.contains(&Card::Copper) && game.supply_count(Card::Silver) > 0 {
                Some(Card::Copper)
            } else {
                None
            };
            pick.into_iter().collect()
        }
        Purpose::PlayTwice => options.iter().copied().min_by_key(|&c| play_priority(c)).into_iter().collect(),
        // Skip Actions drawn by Library once there is no Action left to play them.
        Purpose::SetAside => if player.actions == 0 { options.clone() } else { Vec::new() },
        Purpose::SentryTrash => options
            .iter()
            .copied()
            .filter(|&c| is_junk(game, c) || (c == Card::Copper && !is_late_game(game)))
            .collect(),
        Purpose::SentryDiscard => options.iter().copied().filter(|c| c.is_victory()).collect(),
        Purpose::SentryTopCard => best(options).into_iter().collect(),
        Purpose::TopdeckFromHand => {
            let unplayable_action = options
                .iter()
                .copied()
                .filter(|c| c.is_action() && player.actions == 0)
                .max_by_key(|c| c.cost());
            unplayable_action
                .or_else(|| options.iter().copied().min_by_key(|&c| keep_value(c)))
                .into_iter()
                .collect()
        }
    };

    if decision.accepts(&chosen) {
        chosen
    } else {
        // Fall back to the first `min` options, which is always valid.
        options[..decision.min].to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::card::KINGDOM_CARDS;
    use crate::game::PlayerInfo;

    /// Two AIs play full games on every recommended kingdom; every decision
    /// they make must be accepted and every game must finish.
    #[test]
    fn ai_games_finish_on_every_kingdom() {
        let ais: [&dyn AiPlayer; 2] = [&simple::SimpleAi, &medium::MediumAi];
        let kingdoms = crate::card::RECOMMENDED_KINGDOMS
            .iter()
            .map(|(_, k)| k.to_vec())
            .chain(std::iter::once(KINGDOM_CARDS[..10].to_vec()))
            .chain(std::iter::once(KINGDOM_CARDS[16..].to_vec()));

        for kingdom in kingdoms {
            for _ in 0..3 {
                let players = vec![
                    PlayerInfo { name: "A".into(), is_ai: true },
                    PlayerInfo { name: "B".into(), is_ai: true },
                ];
                let mut game = GameState::new(players, &kingdom);
                let mut steps = 0;
                while !game.game_over {
                    steps += 1;
                    assert!(steps < 20_000, "game did not finish on {kingdom:?}");
                    let actor = game.acting_player();
                    let ai = ais[actor];
                    let action = match &game.pending_decision {
                        Some(d) => PlayerAction::Resolve { cards: ai.resolve(&game, d) },
                        None => ai.decide_action(&game, actor).unwrap_or(PlayerAction::EndPhase),
                    };
                    let is_resolve = matches!(action, PlayerAction::Resolve { .. });
                    if let Err(e) = game.execute(actor, action.clone()) {
                        assert!(!is_resolve, "AI answer rejected: {e} for {:?}", game.pending_decision);
                        game.execute(actor, PlayerAction::EndPhase).unwrap();
                    }
                }
                assert!(!game.winners.is_empty());
                let turns = game.players[0].turns_taken;
                let provinces = game.supply_count(Card::Province);
                eprintln!("{turns:>3} turns, {provinces} provinces left, scores {:?}", game.scores);
                assert!(turns >= 10, "suspiciously short game on {kingdom:?}");
            }
        }
    }

    fn play_out(kingdom: &[Card], seats: [&dyn AiPlayer; 2]) -> GameState {
        let players = vec![
            PlayerInfo { name: seats[0].name().into(), is_ai: true },
            PlayerInfo { name: seats[1].name().into(), is_ai: true },
        ];
        let mut game = GameState::new(players, kingdom);
        for _ in 0..20_000 {
            if game.game_over {
                break;
            }
            let actor = game.acting_player();
            let ai = seats[actor];
            let action = match &game.pending_decision {
                Some(d) => PlayerAction::Resolve { cards: ai.resolve(&game, d) },
                None => ai.decide_action(&game, actor).unwrap_or(PlayerAction::EndPhase),
            };
            if game.execute(actor, action).is_err() {
                game.execute(actor, PlayerAction::EndPhase).unwrap();
            }
        }
        game
    }

    /// Win rate of MediumAi against SimpleAi per recommended kingdom.
    /// Run with `cargo test -p backend ai_benchmark -- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn ai_benchmark() {
        const GAMES: usize = 100;
        for (id, kingdom) in crate::card::RECOMMENDED_KINGDOMS {
            let mut medium_wins = 0.0;
            for i in 0..GAMES {
                let medium_seat = i % 2;
                let seats: [&dyn AiPlayer; 2] = if medium_seat == 0 {
                    [&medium::MediumAi, &simple::SimpleAi]
                } else {
                    [&simple::SimpleAi, &medium::MediumAi]
                };
                let game = play_out(&kingdom, seats);
                let medium_name = seats[medium_seat].name();
                if game.winners.iter().any(|w| w == medium_name) {
                    medium_wins += 1.0 / game.winners.len() as f64;
                }
            }
            eprintln!("{id:>16}: MediumAi wins {:.0}%", medium_wins * 100.0 / GAMES as f64);
        }
    }
}
