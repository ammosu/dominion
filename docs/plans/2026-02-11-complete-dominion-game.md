# Complete Dominion Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Dominion game fully playable with clear UI feedback for all player operations, including complex action cards.

**Architecture:** Fix backend-frontend data mismatches, add missing WebSocket message types for complex actions, create card selection modal UI, add PlayAllTreasures button, fix game-over scoring, and improve phase instructions clarity.

**Tech Stack:** Rust (Axum, serde), React, Phaser 3, Zustand, TypeScript, CSS Modules

---

### Task 1: Fix Player Type Mismatch (deck/discard counts)

**Files:**
- Modify: `frontend-new/src/types/game.ts`
- Modify: `frontend-new/src/components/GameUI/DeckAreas.tsx`

**Step 1: Fix the Player type to match backend**

The backend sends `deck: Card[]` and `discard: Card[]` arrays, but frontend expects `deck_size: number` and `discard_size: number`. Fix the type and UI.

In `frontend-new/src/types/game.ts`, change Player interface:
```typescript
export interface Player {
  name: string;
  hand: string[];
  deck: string[];
  discard: string[];
  actions: number;
  buys: number;
  coins: number;
  is_ai: boolean;
}
```

**Step 2: Fix DeckAreas to use array length**

In `frontend-new/src/components/GameUI/DeckAreas.tsx`:
- Change `currentPlayer.deck_size` → `currentPlayer.deck.length`
- Change `currentPlayer.discard_size` → `currentPlayer.discard.length`

**Step 3: Build frontend and verify no type errors**

Run: `cd frontend-new && npm run build`

**Step 4: Commit**

---

### Task 2: Add game_over flag and scores to GameState

**Files:**
- Modify: `frontend-new/src/types/game.ts` - add `game_over` and `scores` fields
- Modify: `frontend-new/src/store/gameStore.ts` - use backend scores
- Modify: `crates/shared/src/game.rs` - add `scores` field populated on game over

**Step 1: Add scores field to Rust GameState**

In `crates/shared/src/game.rs`, add to GameState struct:
```rust
pub scores: Option<Vec<(String, i32)>>,
```

Initialize as `None` in `GameState::new()`.

In `check_game_over()`, after setting `self.game_over = true`, also set:
```rust
self.scores = Some(self.calculate_scores());
```

**Step 2: Update frontend GameState type**

In `frontend-new/src/types/game.ts`:
```typescript
export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy' | 'Cleanup';
  players: Player[];
  supply: Record<string, number>;
  trash: string[];
  log: string[];
  game_over: boolean;
  scores: [string, number][] | null;
}
```

**Step 3: Update gameStore to use backend scores**

In `frontend-new/src/store/gameStore.ts`, change `checkGameOver()`:
```typescript
checkGameOver: () => {
  const state = get().gameState;
  if (!state) return;

  if (state.game_over && state.scores) {
    const scores = state.scores.map(([name, score]) => ({ name, score }));
    set({ isGameOver: true, finalScores: scores });
  }
},
```

**Step 4: Build and test**

Run: `~/.cargo/bin/cargo build --release && cd frontend-new && npm run build`

**Step 5: Commit**

---

### Task 3: Add PlayAllTreasures button and backend WebSocket handler

**Files:**
- Modify: `crates/backend/src/events.rs` - add PlayAllTreasures to ClientMessage
- Modify: `crates/backend/src/websocket.rs` - handle PlayAllTreasures
- Modify: `frontend-new/src/types/websocket.ts` - add PlayAllTreasures type
- Modify: `frontend-new/src/components/GameUI/TurnControls.tsx` - add button

**Step 1: Add PlayAllTreasures to backend ClientMessage**

In `crates/backend/src/events.rs`:
```rust
pub enum ClientMessage {
    PlayCard { card: String },
    PlayTreasure { card: String },
    PlayAllTreasures,
    BuyCard { card: String },
    EndPhase,
    PlayCellar { cards: Vec<String> },
}
```

**Step 2: Handle in websocket.rs**

Add match arm:
```rust
ClientMessage::PlayAllTreasures => {
    test_game.execute(shared::action::PlayerAction::PlayAllTreasures)
}
```

**Step 3: Add to frontend ClientMessage type**

```typescript
| { type: 'PlayAllTreasures' }
```

**Step 4: Add "Play All Treasures" button to TurnControls**

Show the button only during Buy phase when player has treasures in hand.

**Step 5: Build and test**

**Step 6: Commit**

---

### Task 4: Add complex action card WebSocket handlers (Workshop, Militia, Mine, Remodel)

**Files:**
- Modify: `crates/backend/src/events.rs` - add message types
- Modify: `crates/backend/src/websocket.rs` - add handlers
- Modify: `frontend-new/src/types/websocket.ts` - add types

**Step 1: Add to ClientMessage enum**

```rust
PlayWorkshop { card: String },
PlayMilitia,
PlayMine { trash: String, gain: String },
PlayRemodel { trash: String, gain: String },
```

**Step 2: Add handlers in websocket.rs**

Each variant calls the corresponding `PlayerAction` after parsing card names.

**Step 3: Update frontend websocket types**

**Step 4: Build backend**

**Step 5: Commit**

---

### Task 5: Add missing card data (Militia, Mine, Moat, Remodel, Woodcutter)

**Files:**
- Modify: `frontend-new/src/utils/cardData.ts`

**Step 1: Add missing card entries**

Add Militia, Mine, Moat, Remodel, Woodcutter to CARD_DATA.

**Step 2: Commit**

---

### Task 6: Create CardSelectionModal component

**Files:**
- Create: `frontend-new/src/components/GameUI/CardSelectionModal.tsx`
- Create: `frontend-new/src/components/GameUI/CardSelectionModal.module.css`
- Modify: `frontend-new/src/store/uiStore.ts` - add modal state

**Step 1: Add modal state to uiStore**

```typescript
cardSelectionModal: {
  visible: boolean;
  mode: 'discard' | 'gain' | 'trash-and-gain';
  title: string;
  cards: string[];        // cards available to select from
  minSelect: number;
  maxSelect: number;
  gainFilter?: (card: string) => boolean;
  onConfirm: (selected: string[], gained?: string) => void;
} | null;
```

**Step 2: Create CardSelectionModal component**

A modal overlay that shows:
- Title (e.g., "Select cards to discard" / "Choose a card to gain")
- Grid of selectable cards
- Selected cards highlighted
- Confirm button (disabled until min selection met)
- For "trash-and-gain" mode: two-step selection

**Step 3: Style the modal**

**Step 4: Commit**

---

### Task 7: Wire up complex action cards in GameContainer

**Files:**
- Modify: `frontend-new/src/game/GameContainer.tsx` - detect complex action cards and show modal
- Modify: `frontend-new/src/App.tsx` - render CardSelectionModal

**Step 1: Handle Cellar click**

When player clicks Cellar in hand during Action phase:
- Open CardSelectionModal in 'discard' mode
- Show remaining hand cards (excluding Cellar)
- Allow selecting 0+ cards to discard
- On confirm: send `{ type: 'PlayCellar', cards: [...selected] }`

**Step 2: Handle Workshop click**

- Open CardSelectionModal in 'gain' mode
- Show supply cards costing <= 4
- Allow selecting 1 card
- On confirm: send `{ type: 'PlayWorkshop', card: selected }`

**Step 3: Handle Militia click**

- No modal needed (auto-resolves in backend)
- Send `{ type: 'PlayMilitia' }` directly

**Step 4: Handle Mine click**

- Open CardSelectionModal in 'trash-and-gain' mode
- Step 1: Select treasure from hand to trash
- Step 2: Select treasure from supply costing <= trash_cost + 3
- On confirm: send `{ type: 'PlayMine', trash: selected1, gain: selected2 }`

**Step 5: Handle Remodel click**

- Open CardSelectionModal in 'trash-and-gain' mode
- Step 1: Select any card from hand to trash
- Step 2: Select card from supply costing <= trash_cost + 2
- On confirm: send `{ type: 'PlayRemodel', trash: selected1, gain: selected2 }`

**Step 6: Build and test**

**Step 7: Commit**

---

### Task 8: Improve phase instructions and PlayedCards tracking

**Files:**
- Modify: `frontend-new/src/components/GameUI/PhaseInstructions.tsx` - more detailed instructions
- Modify: `frontend-new/src/components/GameUI/PlayedCards.tsx` - better tracking
- Modify: `frontend-new/src/store/gameStore.ts` - track played cards by diffing states

**Step 1: Enhance phase instructions**

Show specific guidance based on hand contents:
- Action phase + has action cards: "Click an action card to play it"
- Action phase + no action cards: "No action cards - click End Action Phase"
- Buy phase + has treasures: "Click treasures to play, or Play All Treasures"
- Buy phase + has coins: "Click supply cards to buy (you have X coins)"

**Step 2: Fix PlayedCards tracking**

Track played treasures by diffing hand between states, instead of guessing from coins.

**Step 3: Commit**

---

### Task 9: Polish and verify end-to-end gameplay

**Files:**
- Various UI tweaks

**Step 1: Verify full game loop works**
- Start game
- Action phase: play action cards (including complex ones)
- Buy phase: play treasures, buy cards
- End turn
- AI takes turn
- Game over shows correct scores

**Step 2: Final commit**
