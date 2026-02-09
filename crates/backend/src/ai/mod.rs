use crate::shared::{action::PlayerAction, game::GameState};

pub mod simple;

/// Trait for AI player decision making
pub trait AiPlayer: Send + Sync {
    /// Decide the next action for the AI player
    /// Returns None if no valid action is available (should end phase)
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction>;

    /// Get the name/identifier of this AI
    fn name(&self) -> &str;
}
