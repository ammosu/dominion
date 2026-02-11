# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dominion card game implementation with Rust backend (Axum + WebSocket) and React + Phaser 3 frontend. Players can play against AI opponents in real-time with a game-like interface.

## Development Commands

### Backend (Rust)
```bash
# Build backend (release mode recommended for performance)
~/.cargo/bin/cargo build --release

# Run backend server (binds to localhost:3000)
./target/release/backend

# Run tests
~/.cargo/bin/cargo test

# Run specific crate tests
~/.cargo/bin/cargo test -p shared
~/.cargo/bin/cargo test -p backend
```

### Frontend (React + Phaser)
```bash
cd frontend-new

# Install dependencies (required after pulling)
npm install

# Start dev server (Vite on localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

### Running the Full Stack
```bash
# Terminal 1: Backend
./target/release/backend

# Terminal 2: Frontend
cd frontend-new && npm run dev

# Access game at http://localhost:5173
```

## Architecture

### Backend Architecture (Rust)

**Cargo Workspace Structure:**
- `crates/backend` - Axum web server with WebSocket handler
- `crates/shared` - Game logic shared between backend and potentially frontend

**Key Backend Modules:**
- `crates/backend/src/websocket.rs` - WebSocket connection handler, processes `ClientMessage` enum and sends `GameStateUpdate` responses
- `crates/backend/src/events.rs` - Defines `ClientMessage` (tagged enum) and `ServerMessage` structures for WebSocket communication
- `crates/backend/src/ai/` - AI player implementations (SimpleAi)
- `crates/shared/src/action.rs` - Core game action execution (`PlayerAction` enum, validation, state mutations)
- `crates/shared/src/game.rs` - `GameState` struct, turn phases, supply management
- `crates/shared/src/card.rs` - Card definitions and properties
- `crates/shared/src/player.rs` - Player state (hand, deck, discard, resources)

**WebSocket Message Flow:**
1. Frontend sends `ClientMessage` (tagged enum format: `{ type: "BuyCard", card: "Silver" }`)
2. Backend deserializes to Rust enum, validates, executes via `GameState::execute()`
3. Backend serializes updated `GameState` to JSON and broadcasts `ServerMessage`
4. Frontend updates Zustand store, triggers React re-renders and Phaser scene updates

**Critical Message Types:**
- `PlayCard` - Play action cards in Action phase
- `PlayTreasure` - Play treasure cards in Buy phase to gain coins
- `BuyCard` - Purchase cards from supply in Buy phase
- `EndPhase` - Progress to next phase (Action → Buy → Cleanup → next player's Action)

### Frontend Architecture (React + Phaser 3)

**Hybrid Architecture:**
- **React Layer** - UI components (TopBar, ActionLog, TurnControls, Toast notifications)
- **Phaser Layer** - Game rendering (hand cards, supply area, animations)
- **Zustand Store** - Central state management, bridges React and Phaser

**Key Frontend Modules:**
- `frontend-new/src/game/GameContainer.tsx` - Bridge between React and Phaser, handles WebSocket events, validates actions client-side before sending
- `frontend-new/src/game/scenes/TableScene.ts` - Main Phaser scene, manages hand cards and supply area
- `frontend-new/src/game/objects/` - Phaser game objects (Card, Hand, SupplyArea, SupplyPile)
- `frontend-new/src/store/gameStore.ts` - Zustand store for game state
- `frontend-new/src/store/uiStore.ts` - Zustand store for UI state (language, toast notifications, modals)
- `frontend-new/src/services/websocket.ts` - WebSocket client wrapper
- `frontend-new/src/utils/cardData.ts` - Card metadata (names, costs, translations)

**State Synchronization:**
- WebSocket message → `gameStore.setGameState()` → triggers React useEffect hooks
- React useEffect → calls Phaser scene methods (`updateHand()`, `updateSupply()`, `updateLanguage()`)
- Phaser scene events → emit to GameContainer → send WebSocket messages

**Client-Side Validation:**
GameContainer validates all actions before sending to backend:
- Buy phase required for buying/playing treasures
- Action phase required for playing action cards
- Sufficient resources (coins, buys, actions)
- Card in hand, supply not empty
- Shows Toast notifications for validation failures

**AI Turn Automation:**
`AITurnController` monitors game state, automatically sends `EndPhase` messages for AI players until turn switches to human player.

### Game Flow

**Turn Structure:**
1. **Action Phase** - Play action cards (Village, Smithy, etc.) using available actions
2. **Buy Phase** - Play treasures for coins, then buy cards from supply
3. **Cleanup Phase** - Discard hand, draw 5 new cards, reset resources, advance to next player

**Card Types:**
- **Treasure** (Copper, Silver, Gold) - Play in Buy phase via `PlayTreasure` to add coins
- **Victory** (Estate, Duchy, Province) - Provide victory points at game end
- **Action** (Village, Smithy, Market, etc.) - Play in Action phase via `PlayCard`
- **Curse** - Negative victory points

**Starting Deck:**
7 Copper + 3 Estate, shuffled, 5 cards drawn. Standard Dominion rules.

## Critical Implementation Details

### WebSocket Message Format
Backend expects Rust tagged enum format (NOT nested payload):
```typescript
// ✅ Correct
{ type: 'BuyCard', card: 'Silver' }

// ❌ Wrong (old format)
{ type: 'BuyCard', payload: { card: 'Silver' } }
```

### Card Action Routing
- Treasure cards (Copper/Silver/Gold) → `PlayTreasure` action (adds coins in Buy phase)
- Action cards (Village/Smithy/etc.) → `PlayCard` action (uses action in Action phase)
- GameContainer automatically routes based on card type

### Language Support
- All UI supports zh/en toggle via `uiStore.language`
- Card names translated via `cardData.ts` `getCardName()`
- Phaser objects have `updateLanguage()` method called when language changes
- Toast notifications use current language

### AI Opponent Behavior
- AI player names contain "Bot" or "AI"
- AITurnController monitors `gameState.current_player`
- Automatically sends `EndPhase` until player index changes
- Backend AI (SimpleAi) makes actual card choices

### Common Gotchas

**Backend:**
- Must use `~/.cargo/bin/cargo` explicitly (cargo not in PATH)
- WebSocket handler creates new game per connection (not persistent across connections)
- `parse_card()` in websocket.rs must match all card names exactly

**Frontend:**
- Phaser canvas renders hand cards, not React components
- Must call Phaser scene methods from React useEffect, not directly
- Hand cards sync via `scene.updateHand(gameState.players[current_player].hand)`
- Supply area updates via `scene.updateSupply(supply, costs)`
- Toast notifications auto-dismiss after 3 seconds

**Integration:**
- Backend port 3000, frontend port 5173 (WebSocket connects to ws://localhost:3000/ws)
- Frontend sends messages, backend always responds with full `GameStateUpdate`
- Client-side validation prevents invalid actions from reaching backend
- Backend validation is authoritative (client validation is UX, not security)

## File Organization

### Backend Structure
```
crates/
├── backend/
│   └── src/
│       ├── main.rs          - Axum server setup, HTTP routes
│       ├── websocket.rs     - WebSocket handler, message processing
│       ├── events.rs        - Message type definitions
│       └── ai/              - AI player implementations
└── shared/
    └── src/
        ├── lib.rs           - Public exports
        ├── game.rs          - GameState, turn management
        ├── action.rs        - Action execution, validation
        ├── card.rs          - Card definitions
        └── player.rs        - Player state
```

### Frontend Structure
```
frontend-new/src/
├── game/                    - Phaser layer
│   ├── PhaserGame.ts        - Phaser instance wrapper
│   ├── GameContainer.tsx    - React-Phaser bridge
│   ├── AITurnController.ts  - AI turn automation
│   ├── scenes/              - Phaser scenes
│   ├── objects/             - Phaser game objects
│   ├── animations/          - Animation utilities
│   └── config/              - Phaser config
├── components/GameUI/       - React UI components
├── store/                   - Zustand stores
├── services/                - WebSocket client
├── utils/                   - Card data, sound manager
└── types/                   - TypeScript definitions
```

## Testing & Debugging

### Backend Debugging
- Backend logs to stdout (check console for "Received: ..." messages)
- Action errors logged to stderr with `ActionError` details
- Test game state serialization: `cargo test test_gamestate_serialization -p shared`

### Frontend Debugging
- Browser console shows WebSocket messages and action requests
- Toast notifications show validation failures
- Phaser canvas events logged via `console.log()` in GameContainer
- Use Playwright skill to inspect UI: `/init` then describe what you want to test

### Common Issues
- **Cards not clickable**: Check if Phaser scene `updateHand()` was called
- **Purchase fails silently**: Check Toast notification (top-right), likely validation failure
- **AI infinite loop**: AITurnController should check `currentPlayer` index change, not phase
- **Language toggle not updating cards**: Phaser objects need `updateLanguage()` implementation
