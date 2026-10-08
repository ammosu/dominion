use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};

use crate::card::Card;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    pub hand: Vec<Card>,
    /// Draw pile; the last element is the top card.
    pub deck: Vec<Card>,
    pub discard: Vec<Card>,
    pub in_play: Vec<Card>, // Cards played this turn (moved to discard at cleanup)
    pub set_aside: Vec<Card>, // e.g. Actions skipped by Library
    pub actions: u32,
    pub buys: u32,
    pub coins: u32,
    pub turns_taken: u32,
    pub is_ai: bool,
}

impl Player {
    pub fn new(name: String, is_ai: bool) -> Self {
        let mut deck: Vec<Card> = Vec::with_capacity(10);
        deck.extend(std::iter::repeat(Card::Copper).take(7));
        deck.extend(std::iter::repeat(Card::Estate).take(3));
        deck.shuffle(&mut rand::rng());

        let mut player = Player {
            name,
            hand: Vec::new(),
            deck,
            discard: Vec::new(),
            in_play: Vec::new(),
            set_aside: Vec::new(),
            actions: 1,
            buys: 1,
            coins: 0,
            turns_taken: 0,
            is_ai,
        };
        player.draw_cards(5);
        player
    }

    /// Takes the top card of the deck, shuffling the discard pile in first if
    /// the deck is empty. Returns `None` when both are empty.
    pub fn take_top_card(&mut self) -> Option<Card> {
        if self.deck.is_empty() {
            if self.discard.is_empty() {
                return None;
            }
            self.deck.append(&mut self.discard);
            self.deck.shuffle(&mut rand::rng());
        }
        self.deck.pop()
    }

    pub fn draw_one(&mut self) -> Option<Card> {
        let card = self.take_top_card()?;
        self.hand.push(card);
        Some(card)
    }

    pub fn draw_cards(&mut self, n: usize) -> usize {
        (0..n).take_while(|_| self.draw_one().is_some()).count()
    }

    /// Removes up to `n` cards from the top of the deck (top card first).
    pub fn reveal_top(&mut self, n: usize) -> Vec<Card> {
        (0..n).map_while(|_| self.take_top_card()).collect()
    }

    pub fn remove_from_hand(&mut self, card: Card) -> bool {
        match self.hand.iter().position(|c| *c == card) {
            Some(pos) => {
                self.hand.remove(pos);
                true
            }
            None => false,
        }
    }

    pub fn discard_hand(&mut self) {
        self.discard.append(&mut self.hand);
    }

    pub fn all_cards(&self) -> impl Iterator<Item = &Card> {
        self.deck
            .iter()
            .chain(self.hand.iter())
            .chain(self.discard.iter())
            .chain(self.in_play.iter())
            .chain(self.set_aside.iter())
    }

    pub fn victory_points(&self) -> i32 {
        let total_cards = self.all_cards().count() as i32;
        self.all_cards()
            .map(|card| match card {
                Card::Gardens => total_cards / 10,
                other => other.victory_points(),
            })
            .sum()
    }
}
