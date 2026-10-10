//! One human-vs-AI game, driven by protocol messages. Shared by the
//! WebSocket server and the WebAssembly build so both behave identically.

use rand::seq::IndexedRandom;

use crate::ai::{medium::MediumAi, run_ai_turns, simple::SimpleAi, AiPlayer};
use crate::card::{recommended_kingdom, Card, KINGDOM_CARDS};
use crate::game::{GameState, PlayerInfo};
use crate::protocol::{ClientMessage, ServerMessage};

pub const HUMAN: usize = 0;

/// A recommended set id, "random", or a comma-separated list of 10 card ids.
/// Anything else falls back to the First Game set.
pub fn parse_kingdom(spec: Option<&str>) -> Vec<Card> {
    let spec = spec.unwrap_or("first-game");
    if let Some(cards) = recommended_kingdom(spec) {
        return cards.to_vec();
    }
    if spec == "random" {
        return KINGDOM_CARDS.choose_multiple(&mut rand::rng(), 10).copied().collect();
    }
    let mut cards: Vec<Card> = spec
        .split(',')
        .filter_map(|id| serde_json::from_value(serde_json::Value::String(id.trim().to_string())).ok())
        .filter(Card::is_kingdom)
        .collect();
    cards.sort();
    cards.dedup();
    if cards.len() == 10 {
        cards
    } else {
        recommended_kingdom("first-game").unwrap().to_vec()
    }
}

pub struct Session {
    game: GameState,
    ai: Box<dyn AiPlayer>,
}

impl Session {
    /// `name` is the human's, `opponent` the AI's; both are trimmed to 20 characters.
    pub fn new(difficulty: &str, kingdom: Option<&str>, name: Option<&str>, opponent: Option<&str>) -> Self {
        let ai: Box<dyn AiPlayer> = if difficulty == "simple" {
            Box::new(SimpleAi::new())
        } else {
            Box::new(MediumAi::new())
        };
        let clean = |name: Option<&str>, default: &str| {
            name.map(|n| n.trim().chars().take(20).collect::<String>())
                .filter(|n| !n.is_empty())
                .unwrap_or_else(|| default.to_string())
        };
        let players = vec![
            PlayerInfo { name: clean(name, "Alice"), is_ai: false },
            PlayerInfo { name: clean(opponent, "Bot"), is_ai: true },
        ];
        let game = GameState::new(players, &parse_kingdom(kingdom));
        Session { game, ai }
    }

    pub fn ai_name(&self) -> &str {
        self.ai.name()
    }

    pub fn kingdom(&self) -> &[Card] {
        &self.game.kingdom
    }

    /// The state to show before the first human message.
    pub fn start(&mut self) -> ServerMessage {
        run_ai_turns(&mut self.game, self.ai.as_ref());
        // Nothing to animate on the opening table.
        self.game.events.clear();
        ServerMessage::state_update(self.game.clone(), HUMAN, None)
    }

    /// Applies one client message (JSON), lets the AI act until the human
    /// must act again, and returns the resulting state. Its `events` cover
    /// exactly this message and the AI turns it triggered.
    pub fn handle(&mut self, text: &str) -> ServerMessage {
        self.game.events.clear();
        let error = match serde_json::from_str::<ClientMessage>(text) {
            Ok(message) => self.game.execute(HUMAN, message.into()).err().map(|e| e.to_string()),
            Err(e) => Some(format!("Invalid message: {e}")),
        };
        run_ai_turns(&mut self.game, self.ai.as_ref());
        ServerMessage::state_update(self.game.clone(), HUMAN, error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kingdom_spec_parsing() {
        assert_eq!(parse_kingdom(Some("deck-top")), recommended_kingdom("deck-top").unwrap().to_vec());
        assert_eq!(parse_kingdom(Some("random")).len(), 10);
        let custom = "Witch,Laboratory,Market,Festival,Sentry,Library,CouncilRoom,Smithy,Militia,ThroneRoom";
        let parsed = parse_kingdom(Some(custom));
        assert_eq!(parsed.len(), 10);
        assert!(parsed.contains(&Card::ThroneRoom));
        assert_eq!(parse_kingdom(Some("Witch,Copper")), recommended_kingdom("first-game").unwrap().to_vec());
        assert_eq!(parse_kingdom(None), recommended_kingdom("first-game").unwrap().to_vec());
    }

    #[test]
    fn session_round_trip() {
        let mut session = Session::new("simple", Some("first-game"), Some("  Tester  "), Some(" 梅林 "));
        let start = serde_json::to_value(session.start()).unwrap();
        assert_eq!(start["payload"]["game_state"]["players"][0]["name"], "Tester");
        assert_eq!(start["payload"]["game_state"]["players"][1]["name"], "梅林");

        let reply = serde_json::to_value(session.handle(r#"{"type":"EndPhase"}"#)).unwrap();
        assert!(reply["payload"]["error"].is_null());
        assert_eq!(reply["payload"]["game_state"]["phase"], "Buy");

        let reply = serde_json::to_value(session.handle("not json")).unwrap();
        assert!(reply["payload"]["error"].as_str().unwrap().starts_with("Invalid message"));
        assert_eq!(reply["payload"]["game_state"]["events"], serde_json::json!([]), "a rejected message changes nothing");
    }

    #[test]
    fn events_cover_one_message_and_the_ai_turn() {
        let mut session = Session::new("simple", Some("first-game"), None, None);
        let start = serde_json::to_value(session.start()).unwrap();
        assert_eq!(start["payload"]["game_state"]["events"], serde_json::json!([]));

        session.handle(r#"{"type":"EndPhase"}"#);
        let reply = serde_json::to_value(session.handle(r#"{"type":"PlayAllTreasures"}"#)).unwrap();
        let events = reply["payload"]["game_state"]["events"].as_array().unwrap().clone();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0]["kind"], "Play");
        assert_eq!(events[0]["from"], "Hand");

        // Ending the turn: our clean-up, the AI's whole turn, then our turn again.
        let reply = serde_json::to_value(session.handle(r#"{"type":"EndPhase"}"#)).unwrap();
        let kinds: Vec<String> = reply["payload"]["game_state"]["events"]
            .as_array()
            .unwrap()
            .iter()
            .map(|e| e["kind"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(kinds[..3], ["Cleanup", "Draw", "TurnStart"]);
        assert!(kinds.contains(&"Buy".to_string()) || kinds.iter().filter(|k| *k == "Cleanup").count() == 2);
        assert_eq!(kinds.last().unwrap(), "TurnStart");
    }
}
