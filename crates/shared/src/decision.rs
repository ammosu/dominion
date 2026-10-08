use serde::{Deserialize, Serialize};

use crate::card::Card;

/// Where a gained card goes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GainDestination {
    Discard,
    Hand,
    DeckTop,
}

/// Why a decision was asked; tells the engine how to apply the answer and
/// tells clients how to phrase the prompt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum Purpose {
    /// Cellar: discard any number, then draw that many.
    DiscardToDraw,
    /// Chapel: trash up to 4 cards from hand.
    TrashFromHand,
    /// Harbinger: may put a card from the discard pile onto the deck.
    TopdeckFromDiscard,
    /// Vassal: the discarded Action card may be played.
    PlayDiscarded,
    /// Workshop / Remodel / Mine / Artisan: gain one of the options.
    Gain { max_cost: u32, destination: GainDestination },
    /// Bureaucrat (attacked player): put a Victory card from hand onto the deck.
    TopdeckVictory,
    /// Militia (attacked player): discard down to `keep` cards.
    DiscardDownTo { keep: usize },
    /// Moneylender: may trash a Copper for +$3.
    TrashCopper,
    /// Poacher: discard a card per empty Supply pile.
    DiscardPerEmptyPile,
    /// Remodel: trash a card, then gain one costing up to $2 more.
    TrashToRemodel,
    /// Mine: may trash a Treasure, then gain one costing up to $3 more to hand.
    TrashTreasureToMine,
    /// Throne Room: may play an Action card from hand twice.
    PlayTwice,
    /// Bandit (attacked player): choose which revealed Treasure to trash.
    TrashRevealedTreasure { revealed: Vec<Card> },
    /// Library: set aside the drawn Action card?
    SetAside,
    /// Sentry step 1: trash any of the looked-at cards.
    SentryTrash,
    /// Sentry step 2: discard any of the remaining cards.
    SentryDiscard,
    /// Sentry step 3: choose which card goes on top.
    SentryTopCard,
    /// Artisan: put a card from hand onto the deck.
    TopdeckFromHand,
}

/// A choice a specific player must make before the game can continue.
/// The answer is always a sub-multiset of `options` with `min..=max` cards.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Decision {
    pub player: usize,
    pub source: Card,
    pub purpose: Purpose,
    pub options: Vec<Card>,
    pub min: usize,
    pub max: usize,
}

impl Decision {
    /// Checks that `chosen` is a valid answer (respecting duplicates).
    pub fn accepts(&self, chosen: &[Card]) -> bool {
        if chosen.len() < self.min || chosen.len() > self.max {
            return false;
        }
        let mut remaining = self.options.clone();
        chosen.iter().all(|card| match remaining.iter().position(|c| c == card) {
            Some(pos) => {
                remaining.remove(pos);
                true
            }
            None => false,
        })
    }
}

/// Deferred work on the engine's effect stack (last element runs next).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Effect {
    /// Follow the instructions on a card the current player has played.
    Play(Card),
    /// Apply an Attack's effect to one other player.
    Attack { card: Card, target: usize },
    /// Library: keep drawing until 7 cards in hand.
    LibraryDraw,
    /// Library: discard the cards set aside.
    LibraryDiscardSetAside,
    /// Artisan: after gaining, put a card from hand onto the deck.
    ArtisanTopdeck,
}
