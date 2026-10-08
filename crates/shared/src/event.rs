//! What happened during one round of play, in order, for client animations.
//! The log is for people; these are for the table to show cards moving.

use serde::{Deserialize, Serialize};

use crate::card::Card;

/// Where a card comes from or goes to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Zone {
    Hand,
    /// Top of the draw pile.
    Deck,
    Discard,
    InPlay,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum GameEvent {
    /// Cards put into play (an Action, one or all Treasures).
    Play { player: usize, cards: Vec<Card>, from: Zone },
    /// The discard pile was shuffled to form a new deck.
    Shuffle { player: usize },
    /// Cards drawn into hand; only the count, opponents' hands stay hidden.
    Draw { player: usize, count: usize },
    Buy { player: usize, card: Card },
    Gain { player: usize, card: Card, to: Zone },
    Discard { player: usize, cards: Vec<Card>, from: Zone },
    Trash { player: usize, cards: Vec<Card>, from: Zone },
    /// Cards put on top of the deck.
    Topdeck { player: usize, cards: Vec<Card>, from: Zone },
    Attack { player: usize, card: Card, target: usize },
    /// `player` revealed Moat and is unaffected by `card`.
    Blocked { player: usize, card: Card },
    /// Clean-up: in-play cards and the rest of the hand go to the discard pile.
    Cleanup { player: usize },
    TurnStart { player: usize },
    GameOver,
}
