use serde::{Deserialize, Serialize};

use crate::card::Card;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    pub hand: Vec<Card>,
    pub deck: Vec<Card>,
    pub discard: Vec<Card>,
    pub actions: u32,
    pub buys: u32,
    pub coins: u32,
    pub is_ai: bool,
}

impl Player {
    pub fn new(name: String, is_ai: bool) -> Self {
        use rand::seq::SliceRandom;

        let mut deck: Vec<Card> = Vec::with_capacity(10);
        for _ in 0..7 {
            deck.push(Card::Copper);
        }
        for _ in 0..3 {
            deck.push(Card::Estate);
        }

        let mut rng = rand::rng();
        deck.shuffle(&mut rng);

        let hand: Vec<Card> = deck.split_off(deck.len() - 5);

        Player {
            name,
            hand,
            deck,
            discard: Vec::new(),
            actions: 1,
            buys: 1,
            coins: 0,
            is_ai,
        }
    }

    pub fn draw_cards(&mut self, n: usize) {
        use rand::seq::SliceRandom;

        for _ in 0..n {
            if self.deck.is_empty() {
                if self.discard.is_empty() {
                    return; // No cards left anywhere
                }
                self.deck.append(&mut self.discard);
                let mut rng = rand::rng();
                self.deck.shuffle(&mut rng);
            }
            if let Some(card) = self.deck.pop() {
                self.hand.push(card);
            }
        }
    }

    pub fn discard_hand(&mut self) {
        self.discard.append(&mut self.hand);
    }
}
