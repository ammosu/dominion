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
}

impl Player {
    pub fn new(name: String) -> Self {
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
        }
    }
}
