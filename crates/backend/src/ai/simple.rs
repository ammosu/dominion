use super::AiPlayer;
use crate::shared::{action::PlayerAction, game::GameState};

pub struct SimpleAi;

impl SimpleAi {
    pub fn new() -> Self {
        SimpleAi
    }
}

impl AiPlayer for SimpleAi {
    fn decide_action(&self, _game: &GameState, _player_idx: usize) -> Option<PlayerAction> {
        // Stub implementation - will be filled in next task
        None
    }

    fn name(&self) -> &str {
        "SimpleAi"
    }
}
