use serde::{Deserialize, Serialize};

/// Primary card category. A card can additionally be an Attack or Reaction
/// (see `Card::is_attack` / `Card::is_reaction`), matching the 2nd-edition
/// "Action - Attack" / "Action - Reaction" type lines.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CardType {
    Treasure,
    Victory,
    Action,
    Curse,
}

/// Every card in Dominion 2nd edition base set (2016).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Card {
    // Base cards
    Copper,
    Silver,
    Gold,
    Estate,
    Duchy,
    Province,
    Curse,
    // Kingdom cards
    Artisan,
    Bandit,
    Bureaucrat,
    Cellar,
    Chapel,
    CouncilRoom,
    Festival,
    Gardens,
    Harbinger,
    Laboratory,
    Library,
    Market,
    Merchant,
    Militia,
    Mine,
    Moat,
    Moneylender,
    Poacher,
    Remodel,
    Sentry,
    Smithy,
    ThroneRoom,
    Vassal,
    Village,
    Witch,
    Workshop,
}

pub const KINGDOM_CARDS: [Card; 26] = [
    Card::Artisan,
    Card::Bandit,
    Card::Bureaucrat,
    Card::Cellar,
    Card::Chapel,
    Card::CouncilRoom,
    Card::Festival,
    Card::Gardens,
    Card::Harbinger,
    Card::Laboratory,
    Card::Library,
    Card::Market,
    Card::Merchant,
    Card::Militia,
    Card::Mine,
    Card::Moat,
    Card::Moneylender,
    Card::Poacher,
    Card::Remodel,
    Card::Sentry,
    Card::Smithy,
    Card::ThroneRoom,
    Card::Vassal,
    Card::Village,
    Card::Witch,
    Card::Workshop,
];

/// Recommended 10-card sets from the 2nd-edition rulebook ("Dominion alone").
pub const RECOMMENDED_KINGDOMS: [(&str, [Card; 10]); 6] = [
    (
        "first-game",
        [
            Card::Cellar,
            Card::Market,
            Card::Merchant,
            Card::Militia,
            Card::Mine,
            Card::Moat,
            Card::Remodel,
            Card::Smithy,
            Card::Village,
            Card::Workshop,
        ],
    ),
    (
        "size-distortion",
        [
            Card::Artisan,
            Card::Bandit,
            Card::Bureaucrat,
            Card::Chapel,
            Card::Festival,
            Card::Gardens,
            Card::Sentry,
            Card::ThroneRoom,
            Card::Witch,
            Card::Workshop,
        ],
    ),
    (
        "deck-top",
        [
            Card::Artisan,
            Card::Bureaucrat,
            Card::CouncilRoom,
            Card::Festival,
            Card::Harbinger,
            Card::Laboratory,
            Card::Moneylender,
            Card::Sentry,
            Card::Vassal,
            Card::Village,
        ],
    ),
    (
        "sleight-of-hand",
        [
            Card::Cellar,
            Card::CouncilRoom,
            Card::Festival,
            Card::Gardens,
            Card::Library,
            Card::Harbinger,
            Card::Militia,
            Card::Poacher,
            Card::Smithy,
            Card::ThroneRoom,
        ],
    ),
    (
        "improvements",
        [
            Card::Artisan,
            Card::Cellar,
            Card::Market,
            Card::Merchant,
            Card::Mine,
            Card::Moat,
            Card::Moneylender,
            Card::Poacher,
            Card::Remodel,
            Card::Witch,
        ],
    ),
    (
        "silver-and-gold",
        [
            Card::Bandit,
            Card::Bureaucrat,
            Card::Chapel,
            Card::Harbinger,
            Card::Laboratory,
            Card::Merchant,
            Card::Mine,
            Card::Moneylender,
            Card::ThroneRoom,
            Card::Vassal,
        ],
    ),
];

impl Card {
    pub fn cost(&self) -> u32 {
        match self {
            Card::Copper | Card::Curse => 0,
            Card::Cellar | Card::Chapel | Card::Estate | Card::Moat => 2,
            Card::Harbinger | Card::Merchant | Card::Silver | Card::Vassal | Card::Village
            | Card::Workshop => 3,
            Card::Bureaucrat
            | Card::Gardens
            | Card::Militia
            | Card::Moneylender
            | Card::Poacher
            | Card::Remodel
            | Card::Smithy
            | Card::ThroneRoom => 4,
            Card::Bandit
            | Card::CouncilRoom
            | Card::Duchy
            | Card::Festival
            | Card::Laboratory
            | Card::Library
            | Card::Market
            | Card::Mine
            | Card::Sentry
            | Card::Witch => 5,
            Card::Artisan | Card::Gold => 6,
            Card::Province => 8,
        }
    }

    pub fn card_type(&self) -> CardType {
        match self {
            Card::Copper | Card::Silver | Card::Gold => CardType::Treasure,
            Card::Estate | Card::Duchy | Card::Province | Card::Gardens => CardType::Victory,
            Card::Curse => CardType::Curse,
            _ => CardType::Action,
        }
    }

    pub fn is_action(&self) -> bool {
        self.card_type() == CardType::Action
    }

    pub fn is_treasure(&self) -> bool {
        self.card_type() == CardType::Treasure
    }

    pub fn is_victory(&self) -> bool {
        self.card_type() == CardType::Victory
    }

    pub fn is_attack(&self) -> bool {
        matches!(self, Card::Bandit | Card::Bureaucrat | Card::Militia | Card::Witch)
    }

    pub fn is_reaction(&self) -> bool {
        matches!(self, Card::Moat)
    }

    pub fn is_kingdom(&self) -> bool {
        KINGDOM_CARDS.contains(self)
    }

    pub fn treasure_value(&self) -> u32 {
        match self {
            Card::Copper => 1,
            Card::Silver => 2,
            Card::Gold => 3,
            _ => 0,
        }
    }

    /// Fixed victory points. Gardens depends on deck size; use
    /// `Player::victory_points` for the real total.
    pub fn victory_points(&self) -> i32 {
        match self {
            Card::Estate => 1,
            Card::Duchy => 3,
            Card::Province => 6,
            Card::Curse => -1,
            _ => 0,
        }
    }
}

pub fn recommended_kingdom(name: &str) -> Option<[Card; 10]> {
    RECOMMENDED_KINGDOMS
        .iter()
        .find(|(id, _)| *id == name)
        .map(|(_, cards)| *cards)
}
