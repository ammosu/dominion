# Game Logic & Interactive Turns Design

## Decisions

- All 5 action cards functional (Cellar, Market, Smithy, Village, Workshop)
- In-memory state with Arc<Mutex<HashMap<game_id, GameState>>>
- Single /action endpoint with tagged PlayerAction enum
- Hot-seat multiplayer (players take turns on same screen)

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /api/game/new | { player_names: [...] } | { game_id, state } |
| GET | /api/game/:id | — | GameState |
| POST | /api/game/:id/action | PlayerAction JSON | GameState or error |

### PlayerAction variants

- PlayCard { card } — Smithy, Village, Market
- PlayCellar { discards: [Card] }
- PlayWorkshop { gain: Card }
- PlayTreasure { card }
- PlayAllTreasures
- BuyCard { card }
- EndPhase

### ActionError variants

NotYourTurn, WrongPhase, CardNotInHand, NotEnoughCoins, SupplyEmpty, NotEnoughActions, NotEnoughBuys, InvalidTarget

## Game Logic (shared crate)

- New file: action.rs with PlayerAction, ActionError, ActionResult
- GameState::execute(&mut self, action) validates and applies
- Player::draw_cards(n) with shuffle-discard-into-deck
- Player::discard_hand() for cleanup
- Game over: Province pile empty OR 3+ supply piles empty

## Frontend Interactions

- Action phase: action cards clickable, "End Actions" button
- Buy phase: "Play All Treasures" button, affordable supply piles clickable, "End Turn" button
- Cellar: toggle-select hand cards, confirm button
- Workshop: clickable supply piles costing ≤4
- Action log panel showing recent moves
- Game over screen with final scores
