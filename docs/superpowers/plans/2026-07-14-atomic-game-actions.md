# Atomic Game Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GameState::execute` atomic and make Remodel validate duplicate-card targets before mutating state.

**Architecture:** `GameState::execute` will clone the current state, dispatch and log the action against the working copy, and commit the working copy only on success. Remodel will count matching cards before moving the played Remodel, so trashing Remodel requires a second copy in hand.

**Tech Stack:** Rust 2021, Cargo workspace, serde/serde_json, built-in Rust test framework

## Global Constraints

- Change only shared Rust game logic and its tests in this implementation batch.
- Do not change WebSocket, REST, AI, frontend, card metadata, or deployment behavior.
- Preserve the public `GameState::execute(action) -> ActionResult` interface.
- Preserve successful action logs, AI prefixes, and turn announcements.
- Any returned `Err` must leave the serialized `GameState` unchanged.
- Commit production changes and regression tests together as `fix: make game actions atomic`.
- Do not bundle existing workspace formatting or Clippy cleanup into this commit.

---

### Task 1: Add transactional execution and Remodel multiplicity validation

**Files:**
- Modify: `crates/shared/src/action.rs:50-98`
- Modify: `crates/shared/src/action.rs:374-416`
- Test: `crates/shared/src/action.rs` (`#[cfg(test)]` module appended after the `GameState` implementation)

**Interfaces:**
- Consumes: `GameState: Clone + Serialize`, `PlayerAction`, `ActionResult`, `ActionError`, `Card`, `PlayerInfo`, and `TurnPhase`.
- Produces: unchanged public `GameState::execute(&mut self, PlayerAction) -> ActionResult` with an atomic error contract; private `execute_in_place(&mut self, PlayerAction) -> ActionResult` for dispatch and success logging.

- [ ] **Step 1: Add passing characterization tests for valid Remodel behavior**

Append this test module to `crates/shared/src/action.rs` after the existing `impl GameState` block:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::PlayerInfo;

    fn game_with_hand(hand: Vec<Card>) -> GameState {
        let mut game = GameState::new(vec![
            PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ]);

        let player = &mut game.players[0];
        player.hand = hand;
        player.deck.clear();
        player.discard.clear();
        player.in_play.clear();
        player.actions = 1;
        player.buys = 1;
        player.coins = 0;

        game.current_player = 0;
        game.phase = TurnPhase::Action;
        game.trash.clear();
        game.game_over = false;
        game.log.clear();
        game.scores = None;
        game
    }

    #[test]
    fn valid_remodel_moves_all_cards_and_consumes_one_action() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Copper]);
        let silver_before = game.supply[&Card::Silver];

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Copper,
            gain: Card::Silver,
        });

        assert!(result.is_ok());
        assert!(game.players[0].hand.is_empty());
        assert_eq!(game.players[0].in_play, vec![Card::Remodel]);
        assert_eq!(game.players[0].discard, vec![Card::Silver]);
        assert_eq!(game.trash, vec![Card::Copper]);
        assert_eq!(game.players[0].actions, 0);
        assert_eq!(game.supply[&Card::Silver], silver_before - 1);
        assert_eq!(game.log.len(), 1);
    }

    #[test]
    fn two_remodels_allow_playing_one_and_trashing_the_other() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Remodel]);

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Remodel,
            gain: Card::Silver,
        });

        assert!(result.is_ok());
        assert!(game.players[0].hand.is_empty());
        assert_eq!(game.players[0].in_play, vec![Card::Remodel]);
        assert_eq!(game.trash, vec![Card::Remodel]);
        assert_eq!(game.players[0].discard, vec![Card::Silver]);
        assert_eq!(game.players[0].actions, 0);
    }
}
```

- [ ] **Step 2: Run the characterization tests and confirm current successful behavior**

Run:

```bash
~/.cargo/bin/cargo test -p shared remodel -- --nocapture
```

Expected: both tests pass before production code changes.

- [ ] **Step 3: Add failing regression tests for partial mutation**

Add these tests inside the same `tests` module:

```rust
    #[test]
    fn failed_remodel_is_atomic_when_target_is_missing() {
        let mut game = game_with_hand(vec![Card::Remodel, Card::Copper]);
        let before = serde_json::to_value(&game).expect("serialize state before action");

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Estate,
            gain: Card::Silver,
        });

        assert!(matches!(result, Err(ActionError::CardNotInHand)));
        assert_eq!(
            serde_json::to_value(&game).expect("serialize state after action"),
            before
        );
    }

    #[test]
    fn single_remodel_cannot_trash_itself_and_state_is_unchanged() {
        let mut game = game_with_hand(vec![Card::Remodel]);
        let before = serde_json::to_value(&game).expect("serialize state before action");

        let result = game.execute(PlayerAction::PlayRemodel {
            trash: Card::Remodel,
            gain: Card::Silver,
        });

        assert!(matches!(result, Err(ActionError::CardNotInHand)));
        assert_eq!(
            serde_json::to_value(&game).expect("serialize state after action"),
            before
        );
    }
```

- [ ] **Step 4: Run the Remodel tests and verify the regression tests fail for the expected reason**

Run:

```bash
~/.cargo/bin/cargo test -p shared remodel -- --nocapture
```

Expected: the two characterization tests pass; both new atomicity tests fail at the serialized-state equality because the current implementation already moved the played Remodel and decremented actions before returning `CardNotInHand`.

- [ ] **Step 5: Refactor `execute` into an atomic transaction boundary**

Replace the current `GameState::execute` body and action dispatch with:

```rust
    pub fn execute(&mut self, action: PlayerAction) -> ActionResult {
        if self.game_over {
            return Err(ActionError::GameOver);
        }

        let mut next_state = self.clone();
        let entries = next_state.execute_in_place(action)?;
        *self = next_state;
        Ok(entries)
    }

    fn execute_in_place(&mut self, action: PlayerAction) -> ActionResult {
        let is_ai = self.players[self.current_player].is_ai;
        let old_phase = self.phase.clone();
        let old_player = self.current_player;

        let entries = match action {
            PlayerAction::PlayCard { card } => self.play_action_card(card),
            PlayerAction::PlayCellar { discards } => self.play_cellar(discards),
            PlayerAction::PlayWorkshop { gain } => self.play_workshop(gain),
            PlayerAction::PlayMilitia => self.play_militia(),
            PlayerAction::PlayMine { trash, gain } => self.play_mine(trash, gain),
            PlayerAction::PlayRemodel { trash, gain } => self.play_remodel(trash, gain),
            PlayerAction::PlayTreasure { card } => self.play_treasure(card),
            PlayerAction::PlayAllTreasures => self.play_all_treasures(),
            PlayerAction::BuyCard { card } => self.buy_card(card),
            PlayerAction::EndPhase => self.end_phase(),
        }?;

        let prefixed_entries: Vec<String> = entries
            .iter()
            .map(|entry| {
                if is_ai {
                    format!("[AI] {entry}")
                } else {
                    entry.clone()
                }
            })
            .collect();
        self.log.extend(prefixed_entries);

        if matches!(old_phase, TurnPhase::Buy)
            && matches!(self.phase, TurnPhase::Action)
            && old_player != self.current_player
        {
            let next_name = &self.players[self.current_player].name;
            self.log.push(format!("{next_name}'s turn"));
        }

        Ok(entries)
    }
```

- [ ] **Step 6: Replace Remodel's empty validation branch with multiplicity validation**

In `play_remodel`, replace the empty `if !player.hand.contains(&trash) || trash == Card::Remodel` block with:

```rust
        let matching_cards = player.hand.iter().filter(|&&card| card == trash).count();
        let required_matches = if trash == Card::Remodel { 2 } else { 1 };
        if matching_cards < required_matches {
            return Err(ActionError::CardNotInHand);
        }
```

- [ ] **Step 7: Run targeted tests and confirm RED becomes GREEN**

Run:

```bash
~/.cargo/bin/cargo test -p shared remodel -- --nocapture
```

Expected: 4 Remodel tests pass, 0 fail.

- [ ] **Step 8: Run shared and workspace verification**

Run:

```bash
~/.cargo/bin/cargo test -p shared
~/.cargo/bin/cargo test --all-targets
~/.cargo/bin/cargo clippy -p shared --lib -- -D warnings
git diff --check
```

Expected:

- Shared: 5 tests pass (4 action tests plus the existing serialization test).
- Workspace: backend's existing serialization test and all 5 shared tests pass.
- Shared production Clippy check passes with warnings denied.
- `git diff --check` prints no errors.

Also record the known repository-wide baseline without changing unrelated files:

```bash
~/.cargo/bin/cargo fmt --all -- --check
~/.cargo/bin/cargo clippy --all-targets -- -D warnings
```

Expected baseline: both commands remain non-zero because of pre-existing formatting diffs and Clippy findings documented in the design; confirm the touched behavior introduced no additional diagnostic.

- [ ] **Step 9: Review the scoped diff**

Run:

```bash
git diff -- crates/shared/src/action.rs
git status --short
```

Expected: only `crates/shared/src/action.rs` is part of the implementation diff. Existing unrelated untracked files remain untouched.

- [ ] **Step 10: Commit the implementation batch**

Run:

```bash
git add crates/shared/src/action.rs
git commit -m "fix: make game actions atomic"
```

Expected: one commit containing the transaction boundary, Remodel validation, and four tests.
