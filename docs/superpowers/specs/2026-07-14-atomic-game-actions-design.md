# Atomic Game Actions Design

## Purpose

Make every `GameState::execute` call atomic and correct the Remodel card's hand validation. A rejected player action must not consume actions, move cards, change supply, append logs, or otherwise mutate game state.

## Scope

This batch changes only the shared Rust game logic and its tests. It does not change the WebSocket protocol, REST endpoints, AI decision-making, frontend behavior, card metadata, or deployment configuration.

## Behavioral Contract

- `GameState::execute(action)` returns the same `ActionResult` shape used today.
- When execution returns `Ok(log_entries)`, all state mutations and existing log behavior are committed together.
- When execution returns `Err(error)`, the complete `GameState` remains byte-for-byte equivalent under serialization to its state before the call.
- Existing game-over rejection remains non-mutating.
- Existing AI log prefixes and turn-announcement behavior remain unchanged on successful actions.

## Architecture

`GameState::execute` becomes a transaction boundary. It clones the current state into a working copy, applies the action and success logging to that copy, and assigns the working copy back to `self` only after the entire operation succeeds. This central guarantee prevents partial mutations in current and future card implementations without requiring bespoke rollback code in every action method.

The existing action dispatch moves into a private in-place helper. Card-specific methods continue to validate and mutate the working copy. This keeps the public API unchanged while separating transaction control from card behavior.

## Remodel Validation

Before moving the played Remodel into `in_play`, the implementation verifies that the requested trash card will still exist in hand afterward:

- A non-Remodel target requires at least one matching card in hand.
- A Remodel target requires at least two Remodel cards in hand: one to play and one to trash.
- An unavailable target returns `ActionError::CardNotInHand` before card-specific mutation begins.
- Cost and supply checks retain their current error variants.

## Tests

Tests use the real `GameState` and `PlayerAction` types without mocks.

1. A Remodel request for a card not in hand returns `CardNotInHand` and leaves the serialized state unchanged.
2. A player holding only one Remodel cannot trash that same Remodel; the state remains unchanged.
3. A player holding two Remodel cards can play one and trash the other.
4. A valid Remodel targeting another hand card still moves the played Remodel to `in_play`, moves the target to `trash`, gains the selected card to discard, decrements supply, and consumes one action.
5. Existing workspace tests continue to pass.

## Verification

The implementation batch must run:

```bash
~/.cargo/bin/cargo test -p shared
~/.cargo/bin/cargo test --all-targets
~/.cargo/bin/cargo fmt --all -- --check
~/.cargo/bin/cargo clippy --all-targets -- -D warnings
```

The repository already contains unrelated formatting and Clippy failures. The implementation must not introduce new failures; any pre-existing failures will be reported explicitly rather than silently bundled into this behavior-change commit.

## Commit Boundary

The production change and its regression tests form one independent commit:

```text
fix: make game actions atomic
```

Formatting or lint cleanup outside the touched behavior belongs in later independent commits.
