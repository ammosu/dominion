pub mod action;
pub mod card;
pub mod game;
pub mod player;

pub use game::{GameState, PlayerInfo, Supply, TurnPhase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gamestate_serialization() {
        let players = vec![
            PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ];

        let game = GameState::new(players);
        let json = serde_json::to_string(&game).unwrap();

        // Parse back to verify structure
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();

        // Verify supply field exists and is an object
        assert!(value.get("supply").is_some(), "supply field should exist");
        assert!(value["supply"].is_object(), "supply should be an object");

        // Verify trash field exists and is an array
        assert!(value.get("trash").is_some(), "trash field should exist");
        assert!(value["trash"].is_array(), "trash should be an array");

        // Verify supply has entries
        let supply = value["supply"].as_object().unwrap();
        assert!(supply.len() > 0, "supply should have entries");
        assert!(supply.contains_key("Copper"), "supply should contain Copper");
        assert!(supply.contains_key("Province"), "supply should contain Province");

        println!("✓ GameState serialization verified");
        println!("  - supply has {} entries", supply.len());
        println!("  - trash is empty array: {}", value["trash"].as_array().unwrap().is_empty());
        println!("\nSample supply entries:");
        for (key, val) in supply.iter().take(5) {
            println!("  {}: {}", key, val);
        }
    }
}
