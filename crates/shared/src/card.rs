use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CardType {
    Treasure,
    Victory,
    Action,
    Curse,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Card {
    // Treasure
    Copper,
    Silver,
    Gold,
    // Victory
    Estate,
    Duchy,
    Province,
    // Curse
    Curse,
    // Action
    Cellar,
    Market,
    Militia,
    Mine,
    Moat,
    Remodel,
    Smithy,
    Village,
    Woodcutter,
    Workshop,
}

impl Card {
    pub fn cost(&self) -> u32 {
        match self {
            Card::Copper => 0,
            Card::Silver => 3,
            Card::Gold => 6,
            Card::Estate => 2,
            Card::Duchy => 5,
            Card::Province => 8,
            Card::Curse => 0,
            Card::Cellar => 2,
            Card::Market => 5,
            Card::Militia => 4,
            Card::Mine => 5,
            Card::Moat => 2,
            Card::Remodel => 4,
            Card::Smithy => 4,
            Card::Village => 3,
            Card::Woodcutter => 3,
            Card::Workshop => 3,
        }
    }

    pub fn card_type(&self) -> CardType {
        match self {
            Card::Copper | Card::Silver | Card::Gold => CardType::Treasure,
            Card::Estate | Card::Duchy | Card::Province => CardType::Victory,
            Card::Curse => CardType::Curse,
            Card::Cellar
            | Card::Market
            | Card::Militia
            | Card::Mine
            | Card::Moat
            | Card::Remodel
            | Card::Smithy
            | Card::Village
            | Card::Woodcutter
            | Card::Workshop => CardType::Action,
        }
    }

    pub fn treasure_value(&self) -> u32 {
        match self {
            Card::Copper => 1,
            Card::Silver => 2,
            Card::Gold => 3,
            _ => 0,
        }
    }

    pub fn victory_points(&self) -> i32 {
        match self {
            Card::Estate => 1,
            Card::Duchy => 3,
            Card::Province => 6,
            Card::Curse => -1,
            _ => 0,
        }
    }

    pub fn is_attack(&self) -> bool {
        matches!(self, Card::Militia)
    }
}
