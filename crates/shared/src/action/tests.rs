use super::*;
use crate::card::KINGDOM_CARDS;
use crate::game::PlayerInfo;
use Card::*;

const ALICE: usize = 0;
const BOT: usize = 1;

fn players(n: usize) -> Vec<PlayerInfo> {
    (0..n)
        .map(|i| PlayerInfo {
            name: ["Alice", "Bot", "Carol", "Dave"][i].to_string(),
            is_ai: i > 0,
        })
        .collect()
}

/// Every Kingdom card is in the Supply; all zones are empty except the
/// current player's hand. Deck vectors list the top card last.
fn game_with_hand(hand: Vec<Card>) -> GameState {
    let mut game = GameState::new(players(2), &KINGDOM_CARDS);
    for player in &mut game.players {
        player.hand.clear();
        player.deck.clear();
        player.discard.clear();
    }
    game.players[ALICE].hand = hand;
    game.log.clear();
    game
}

fn play(game: &mut GameState, card: Card) {
    game.execute(ALICE, PlayerAction::PlayCard { card }).expect("play card");
}

fn resolve(game: &mut GameState, actor: usize, cards: Vec<Card>) {
    game.execute(actor, PlayerAction::Resolve { cards }).expect("resolve decision");
}

fn purpose(game: &GameState) -> Purpose {
    game.pending_decision.as_ref().expect("a pending decision").purpose.clone()
}

fn snapshot(game: &GameState) -> serde_json::Value {
    serde_json::to_value(game).unwrap()
}

// ----- atomicity & protocol ----------------------------------------------

#[test]
fn failed_action_leaves_state_untouched() {
    let mut game = game_with_hand(vec![Remodel, Copper]);
    let before = snapshot(&game);
    assert_eq!(game.execute(ALICE, PlayerAction::PlayCard { card: Smithy }), Err(ActionError::CardNotInHand));
    assert_eq!(snapshot(&game), before);
}

#[test]
fn invalid_answer_is_rejected_atomically() {
    let mut game = game_with_hand(vec![Remodel, Copper]);
    play(&mut game, Remodel);
    let before = snapshot(&game);
    let result = game.execute(ALICE, PlayerAction::Resolve { cards: vec![Estate] });
    assert_eq!(result, Err(ActionError::InvalidChoice));
    assert_eq!(snapshot(&game), before);
}

#[test]
fn other_actions_are_blocked_while_a_decision_is_pending() {
    let mut game = game_with_hand(vec![Remodel, Copper, Smithy]);
    game.players[ALICE].actions = 2;
    play(&mut game, Remodel);
    assert_eq!(
        game.execute(ALICE, PlayerAction::PlayCard { card: Smithy }),
        Err(ActionError::DecisionPending)
    );
    assert_eq!(game.execute(ALICE, PlayerAction::EndPhase), Err(ActionError::DecisionPending));
}

#[test]
fn only_the_acting_player_may_act() {
    let mut game = game_with_hand(vec![Smithy]);
    assert_eq!(game.execute(BOT, PlayerAction::EndPhase), Err(ActionError::NotYourTurn));
    assert_eq!(
        game.execute(ALICE, PlayerAction::Resolve { cards: vec![] }),
        Err(ActionError::NoDecisionPending)
    );
}

// ----- simple +stuff cards --------------------------------------------------

#[test]
fn village_smithy_market_laboratory_festival() {
    let mut game = game_with_hand(vec![Village, Smithy, Market, Laboratory, Festival]);
    game.players[ALICE].deck = vec![Copper; 10];

    play(&mut game, Village); // +1 card +2 actions
    play(&mut game, Laboratory); // +2 cards +1 action
    play(&mut game, Market); // +1 card +1 action +1 buy +$1
    play(&mut game, Festival); // +2 actions +1 buy +$2
    play(&mut game, Smithy); // +3 cards

    let alice = &game.players[ALICE];
    assert_eq!(alice.actions, 2);
    assert_eq!(alice.buys, 3);
    assert_eq!(alice.coins, 3);
    assert_eq!(alice.hand.len(), 7);
    assert_eq!(alice.in_play.len(), 5);
}

#[test]
fn council_room_draws_for_everyone() {
    let mut game = game_with_hand(vec![CouncilRoom]);
    game.players[ALICE].deck = vec![Copper; 5];
    game.players[BOT].deck = vec![Estate; 2];
    play(&mut game, CouncilRoom);
    assert_eq!(game.players[ALICE].hand.len(), 4);
    assert_eq!(game.players[ALICE].buys, 2);
    assert_eq!(game.players[BOT].hand, vec![Estate]);
}

// ----- choices on your own turn ---------------------------------------------

#[test]
fn cellar_discards_then_draws_and_stays_in_play() {
    let mut game = game_with_hand(vec![Cellar, Estate, Estate, Copper]);
    game.players[ALICE].deck = vec![Gold, Gold];
    play(&mut game, Cellar);
    assert_eq!(game.players[ALICE].actions, 1);
    resolve(&mut game, ALICE, vec![Estate, Estate]);

    let alice = &game.players[ALICE];
    assert_eq!(alice.in_play, vec![Cellar]);
    assert_eq!(alice.discard, vec![Estate, Estate]);
    assert_eq!(alice.hand, vec![Copper, Gold, Gold]);
}

#[test]
fn chapel_trashes_up_to_four() {
    let mut game = game_with_hand(vec![Chapel, Estate, Estate, Copper, Copper, Curse]);
    play(&mut game, Chapel);
    assert_eq!(game.pending_decision.as_ref().unwrap().max, 4);
    resolve(&mut game, ALICE, vec![Estate, Estate, Curse, Copper]);
    assert_eq!(game.players[ALICE].hand, vec![Copper]);
    assert_eq!(game.trash.len(), 4);
}

#[test]
fn harbinger_topdecks_from_discard() {
    let mut game = game_with_hand(vec![Harbinger]);
    game.players[ALICE].deck = vec![Copper];
    game.players[ALICE].discard = vec![Estate, Gold];
    play(&mut game, Harbinger);
    resolve(&mut game, ALICE, vec![Gold]);
    assert_eq!(game.players[ALICE].deck, vec![Gold]);
    assert_eq!(game.players[ALICE].discard, vec![Estate]);
    assert_eq!(game.players[ALICE].actions, 1);
}

#[test]
fn merchant_bonus_applies_to_first_silver_only_once_per_merchant() {
    let mut game = game_with_hand(vec![Merchant, Merchant, Silver, Silver]);
    game.players[ALICE].deck = vec![Copper, Copper];
    play(&mut game, Merchant);
    play(&mut game, Merchant);
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    game.execute(ALICE, PlayerAction::PlayAllTreasures).unwrap();
    // 2 Silver ($4) + 2 Copper ($2) + 2 Merchants on the first Silver ($2)
    assert_eq!(game.players[ALICE].coins, 8);
}

#[test]
fn vassal_may_play_discarded_action_without_using_an_action() {
    let mut game = game_with_hand(vec![Vassal]);
    game.players[ALICE].deck = vec![Copper, Copper, Copper, Smithy];
    play(&mut game, Vassal);
    assert_eq!(purpose(&game), Purpose::PlayDiscarded);
    resolve(&mut game, ALICE, vec![Smithy]);
    let alice = &game.players[ALICE];
    assert_eq!(alice.coins, 2);
    assert_eq!(alice.hand.len(), 3);
    assert_eq!(alice.in_play, vec![Vassal, Smithy]);
    assert!(alice.discard.is_empty());
    assert_eq!(alice.actions, 0);
}

#[test]
fn workshop_gains_card_costing_up_to_four() {
    let mut game = game_with_hand(vec![Workshop]);
    play(&mut game, Workshop);
    let decision = game.pending_decision.clone().unwrap();
    assert!(decision.options.iter().all(|c| c.cost() <= 4));
    assert!(decision.options.contains(&Gardens));
    let before = game.supply[&Smithy];
    resolve(&mut game, ALICE, vec![Smithy]);
    assert_eq!(game.players[ALICE].discard, vec![Smithy]);
    assert_eq!(game.supply[&Smithy], before - 1);
}

#[test]
fn moneylender_trash_is_optional() {
    let mut game = game_with_hand(vec![Moneylender, Copper]);
    play(&mut game, Moneylender);
    resolve(&mut game, ALICE, vec![Copper]);
    assert_eq!(game.players[ALICE].coins, 3);
    assert_eq!(game.trash, vec![Copper]);

    let mut game = game_with_hand(vec![Moneylender, Copper]);
    play(&mut game, Moneylender);
    resolve(&mut game, ALICE, vec![]);
    assert_eq!(game.players[ALICE].coins, 0);
    assert_eq!(game.players[ALICE].hand, vec![Copper]);
}

#[test]
fn poacher_discards_one_card_per_empty_pile() {
    let mut game = game_with_hand(vec![Poacher, Estate, Copper, Copper]);
    game.players[ALICE].deck = vec![Gold];
    game.supply.insert(Curse, 0);
    game.supply.insert(Smithy, 0);
    play(&mut game, Poacher);
    let decision = game.pending_decision.clone().unwrap();
    assert_eq!((decision.min, decision.max), (2, 2));
    resolve(&mut game, ALICE, vec![Estate, Copper]);
    assert_eq!(game.players[ALICE].hand.len(), 2);
    assert_eq!(game.players[ALICE].coins, 1);
}

#[test]
fn poacher_with_no_empty_piles_asks_nothing() {
    let mut game = game_with_hand(vec![Poacher]);
    play(&mut game, Poacher);
    assert!(game.pending_decision.is_none());
}

#[test]
fn remodel_trashes_then_gains_up_to_two_more() {
    let mut game = game_with_hand(vec![Remodel, Estate]);
    play(&mut game, Remodel);
    resolve(&mut game, ALICE, vec![Estate]);
    let decision = game.pending_decision.clone().unwrap();
    assert_eq!(decision.purpose, Purpose::Gain { max_cost: 4, destination: GainDestination::Discard });
    resolve(&mut game, ALICE, vec![Silver]);
    assert_eq!(game.trash, vec![Estate]);
    assert_eq!(game.players[ALICE].discard, vec![Silver]);
    assert_eq!(game.players[ALICE].in_play, vec![Remodel]);
}

#[test]
fn mine_gains_treasure_to_hand_and_is_optional() {
    let mut game = game_with_hand(vec![Mine, Silver]);
    play(&mut game, Mine);
    resolve(&mut game, ALICE, vec![Silver]);
    let decision = game.pending_decision.clone().unwrap();
    assert!(decision.options.iter().all(Card::is_treasure));
    resolve(&mut game, ALICE, vec![Gold]);
    assert_eq!(game.players[ALICE].hand, vec![Gold]);

    let mut game = game_with_hand(vec![Mine, Silver]);
    play(&mut game, Mine);
    resolve(&mut game, ALICE, vec![]);
    assert!(game.pending_decision.is_none());
    assert_eq!(game.players[ALICE].hand, vec![Silver]);
}

#[test]
fn throne_room_plays_an_action_twice_without_spending_actions() {
    let mut game = game_with_hand(vec![ThroneRoom, Village]);
    game.players[ALICE].deck = vec![Copper, Copper];
    play(&mut game, ThroneRoom);
    resolve(&mut game, ALICE, vec![Village]);
    let alice = &game.players[ALICE];
    assert_eq!(alice.actions, 4);
    assert_eq!(alice.hand, vec![Copper, Copper]);
    assert_eq!(alice.in_play, vec![ThroneRoom, Village]);
}

#[test]
fn throne_room_on_workshop_gains_twice() {
    let mut game = game_with_hand(vec![ThroneRoom, Workshop]);
    play(&mut game, ThroneRoom);
    resolve(&mut game, ALICE, vec![Workshop]);
    resolve(&mut game, ALICE, vec![Silver]);
    resolve(&mut game, ALICE, vec![Village]);
    assert_eq!(game.players[ALICE].discard, vec![Silver, Village]);
    assert!(game.pending_decision.is_none());
}

#[test]
fn throne_room_on_throne_room_plays_two_actions_twice() {
    let mut game = game_with_hand(vec![ThroneRoom, ThroneRoom, Village, Smithy]);
    game.players[ALICE].deck = vec![Copper; 20];
    play(&mut game, ThroneRoom);
    resolve(&mut game, ALICE, vec![ThroneRoom]);
    resolve(&mut game, ALICE, vec![Village]);
    resolve(&mut game, ALICE, vec![Smithy]);
    let alice = &game.players[ALICE];
    assert_eq!(alice.actions, 4);
    assert_eq!(alice.hand.len(), 2 + 6);
    assert_eq!(alice.in_play, vec![ThroneRoom, ThroneRoom, Village, Smithy]);
}

#[test]
fn library_draws_to_seven_and_discards_set_aside_actions() {
    let mut game = game_with_hand(vec![Library, Copper, Copper]);
    // Top card is last: Smithy is drawn first.
    game.players[ALICE].deck = vec![Gold, Gold, Gold, Gold, Gold, Silver, Smithy];
    play(&mut game, Library);
    assert_eq!(purpose(&game), Purpose::SetAside);
    resolve(&mut game, ALICE, vec![Smithy]);
    let alice = &game.players[ALICE];
    assert_eq!(alice.hand.len(), 7);
    assert!(!alice.hand.contains(&Smithy));
    assert_eq!(alice.discard, vec![Smithy]);
    assert!(alice.set_aside.is_empty());
}

#[test]
fn sentry_trashes_discards_and_reorders() {
    let mut game = game_with_hand(vec![Sentry]);
    game.players[ALICE].deck = vec![Gold, Silver, Curse, Copper];
    play(&mut game, Sentry); // draws Copper, looks at Curse + Silver
    let looked = game.pending_decision.clone().unwrap().options;
    assert_eq!(looked, vec![Curse, Silver]);
    resolve(&mut game, ALICE, vec![Curse]);
    resolve(&mut game, ALICE, vec![]);
    assert_eq!(game.trash, vec![Curse]);
    assert_eq!(game.players[ALICE].deck, vec![Gold, Silver]);

    let mut game = game_with_hand(vec![Sentry]);
    game.players[ALICE].deck = vec![Silver, Gold, Copper];
    play(&mut game, Sentry);
    resolve(&mut game, ALICE, vec![]);
    resolve(&mut game, ALICE, vec![]);
    assert_eq!(purpose(&game), Purpose::SentryTopCard);
    resolve(&mut game, ALICE, vec![Gold]);
    assert_eq!(game.players[ALICE].deck, vec![Silver, Gold]);
}

#[test]
fn artisan_gains_to_hand_then_topdecks() {
    let mut game = game_with_hand(vec![Artisan, Estate]);
    play(&mut game, Artisan);
    let decision = game.pending_decision.clone().unwrap();
    assert!(decision.options.iter().all(|c| c.cost() <= 5));
    resolve(&mut game, ALICE, vec![Laboratory]);
    assert_eq!(purpose(&game), Purpose::TopdeckFromHand);
    resolve(&mut game, ALICE, vec![Estate]);
    assert_eq!(game.players[ALICE].hand, vec![Laboratory]);
    assert_eq!(game.players[ALICE].deck, vec![Estate]);
}

// ----- attacks ------------------------------------------------------------

#[test]
fn militia_lets_the_attacked_player_choose_discards() {
    let mut game = game_with_hand(vec![Militia]);
    game.players[BOT].hand = vec![Copper, Copper, Estate, Estate, Gold];
    play(&mut game, Militia);
    assert_eq!(game.acting_player(), BOT);
    assert_eq!(game.execute(ALICE, PlayerAction::Resolve { cards: vec![] }), Err(ActionError::NotYourTurn));
    assert_eq!(
        game.execute(BOT, PlayerAction::Resolve { cards: vec![Estate] }),
        Err(ActionError::InvalidChoice)
    );
    resolve(&mut game, BOT, vec![Estate, Estate]);
    assert_eq!(game.players[BOT].hand, vec![Copper, Copper, Gold]);
    assert_eq!(game.players[ALICE].coins, 2);
    assert_eq!(game.acting_player(), ALICE);
}

#[test]
fn moat_blocks_attacks() {
    let mut game = game_with_hand(vec![Witch, Militia]);
    game.players[ALICE].actions = 2;
    game.players[BOT].hand = vec![Moat, Copper, Copper, Copper, Copper];
    play(&mut game, Witch);
    play(&mut game, Militia);
    assert!(game.pending_decision.is_none());
    assert!(game.players[BOT].discard.is_empty());
    assert_eq!(game.players[BOT].hand.len(), 5);
}

#[test]
fn witch_curses_in_turn_order_until_pile_runs_out() {
    let mut game = GameState::new(players(3), &KINGDOM_CARDS);
    game.players[0].hand = vec![Witch];
    game.players[1].hand.clear();
    game.players[2].hand.clear();
    game.supply.insert(Curse, 1);
    play(&mut game, Witch);
    assert!(game.players[1].discard.contains(&Curse));
    assert!(!game.players[2].discard.contains(&Curse));
}

#[test]
fn bureaucrat_gains_silver_on_deck_and_topdecks_victory() {
    let mut game = game_with_hand(vec![Bureaucrat]);
    game.players[BOT].hand = vec![Estate, Duchy, Copper];
    play(&mut game, Bureaucrat);
    assert_eq!(game.players[ALICE].deck, vec![Silver]);
    assert_eq!(game.acting_player(), BOT);
    resolve(&mut game, BOT, vec![Estate]);
    assert_eq!(game.players[BOT].deck, vec![Estate]);
}

#[test]
fn bureaucrat_auto_topdecks_single_victory_kind() {
    let mut game = game_with_hand(vec![Bureaucrat]);
    game.players[BOT].hand = vec![Estate, Estate, Copper];
    play(&mut game, Bureaucrat);
    assert!(game.pending_decision.is_none());
    assert_eq!(game.players[BOT].deck, vec![Estate]);
    assert_eq!(game.players[BOT].hand, vec![Estate, Copper]);
}

#[test]
fn bandit_trashes_non_copper_treasure() {
    let mut game = game_with_hand(vec![Bandit]);
    game.players[BOT].deck = vec![Copper, Silver];
    play(&mut game, Bandit);
    assert_eq!(game.players[ALICE].discard, vec![Gold]);
    assert_eq!(game.trash, vec![Silver]);
    assert_eq!(game.players[BOT].discard, vec![Copper]);

    let mut game = game_with_hand(vec![Bandit]);
    game.players[BOT].deck = vec![Gold, Silver];
    play(&mut game, Bandit);
    assert_eq!(game.acting_player(), BOT);
    resolve(&mut game, BOT, vec![Silver]);
    assert_eq!(game.trash, vec![Silver]);
    assert_eq!(game.players[BOT].discard, vec![Gold]);
}

// ----- buying, clean-up and game end ---------------------------------------

#[test]
fn cannot_play_treasures_after_buying() {
    let mut game = game_with_hand(vec![Gold, Copper]);
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    game.execute(ALICE, PlayerAction::PlayTreasure { card: Gold }).unwrap();
    game.execute(ALICE, PlayerAction::BuyCard { card: Silver }).unwrap();
    assert_eq!(
        game.execute(ALICE, PlayerAction::PlayTreasure { card: Copper }),
        Err(ActionError::TreasureAfterBuy)
    );
}

#[test]
fn cards_outside_the_kingdom_cannot_be_bought() {
    let mut game = GameState::new(players(2), &crate::card::recommended_kingdom("first-game").unwrap());
    game.phase = TurnPhase::Buy;
    game.players[ALICE].coins = 10;
    assert_eq!(game.execute(ALICE, PlayerAction::BuyCard { card: Witch }), Err(ActionError::NotInSupply));
}

#[test]
fn game_ends_at_end_of_turn_not_on_buy() {
    let mut game = game_with_hand(vec![]);
    game.supply.insert(Province, 1);
    game.phase = TurnPhase::Buy;
    game.players[ALICE].coins = 8;
    game.execute(ALICE, PlayerAction::BuyCard { card: Province }).unwrap();
    assert!(!game.game_over, "the turn is not over yet");
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    assert!(game.game_over);
    assert_eq!(game.winners, vec!["Alice".to_string()]);
}

#[test]
fn three_empty_piles_end_the_game_even_via_gains() {
    let mut game = game_with_hand(vec![Workshop]);
    game.supply.insert(Curse, 0);
    game.supply.insert(Moat, 0);
    game.supply.insert(Village, 1);
    play(&mut game, Workshop);
    resolve(&mut game, ALICE, vec![Village]);
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    assert!(game.game_over);
}

#[test]
fn tie_goes_to_player_with_fewer_turns() {
    let mut game = game_with_hand(vec![]);
    game.players[ALICE].deck = vec![Province];
    game.players[BOT].deck = vec![Province];
    game.players[ALICE].turns_taken = 5;
    game.players[BOT].turns_taken = 4;
    assert_eq!(game.determine_winners(), vec!["Bot".to_string()]);
    game.players[BOT].turns_taken = 5;
    assert_eq!(game.determine_winners().len(), 2);
}

#[test]
fn gardens_scores_one_per_ten_cards_including_in_play() {
    let mut game = game_with_hand(vec![]);
    let alice = &mut game.players[ALICE];
    alice.deck = vec![Copper; 17];
    alice.in_play = vec![Gardens, Gardens];
    alice.discard = vec![Estate];
    // 20 cards: each Gardens worth 2, plus an Estate.
    assert_eq!(alice.victory_points(), 5);
}

#[test]
fn cleanup_resets_turn_and_passes_to_next_player() {
    let mut game = game_with_hand(vec![Merchant]);
    game.players[ALICE].deck = vec![Copper; 10];
    play(&mut game, Merchant);
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    game.execute(ALICE, PlayerAction::EndPhase).unwrap();
    assert_eq!(game.current_player, BOT);
    assert_eq!(game.turn.merchants_played, 0);
    let alice = &game.players[ALICE];
    assert_eq!(alice.hand.len(), 5);
    assert!(alice.in_play.is_empty());
    assert_eq!(alice.turns_taken, 1);
    assert_eq!(game.log.last().unwrap(), "Bot's turn");
}
