pub mod action;
pub mod ai;
pub mod card;
pub mod decision;
pub mod game;
pub mod player;
pub mod protocol;
pub mod session;

pub use game::{GameState, PlayerInfo, Supply, TurnPhase};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::card::{recommended_kingdom, Card};

    #[test]
    fn gamestate_serializes_supply_kingdom_and_decision() {
        let players = vec![
            PlayerInfo { name: "Alice".to_string(), is_ai: false },
            PlayerInfo { name: "Bot".to_string(), is_ai: true },
        ];
        let game = GameState::new(players, &recommended_kingdom("first-game").unwrap());
        let value = serde_json::to_value(&game).unwrap();

        let supply = value["supply"].as_object().unwrap();
        assert_eq!(supply.len(), 17, "7 base piles + 10 kingdom piles");
        assert_eq!(supply["Copper"], 46);
        assert_eq!(supply["Province"], 8);
        assert_eq!(supply["Curse"], 10);
        assert_eq!(supply["Merchant"], 10);
        assert!(!supply.contains_key("Woodcutter"));
        assert!(value["trash"].is_array());
        assert!(value["pending_decision"].is_null());
        assert_eq!(value["kingdom"].as_array().unwrap().len(), 10);
        assert!(value.get("effects").is_none(), "engine internals are not sent");
        assert_eq!(game.players[0].hand.len(), 5);
        assert_eq!(game.players[0].deck.len(), 5);
        assert!(game.kingdom.windows(2).all(|w| w[0].cost() <= w[1].cost()));
        let _ = Card::Copper;
    }

    #[test]
    fn gardens_pile_uses_victory_count_and_curses_scale_with_players() {
        let names = ["A", "B", "C"];
        let players = names
            .iter()
            .map(|n| PlayerInfo { name: n.to_string(), is_ai: false })
            .collect();
        let game = GameState::new(players, &recommended_kingdom("size-distortion").unwrap());
        assert_eq!(game.supply[&Card::Gardens], 12);
        assert_eq!(game.supply[&Card::Province], 12);
        assert_eq!(game.supply[&Card::Curse], 20);
    }
}
