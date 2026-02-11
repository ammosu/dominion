# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dominion card game implementation with Rust backend (Axum + WebSocket) and React + Phaser 3 frontend. Players can play against AI opponents in real-time with a medieval-themed UI. Supports bilingual interface (繁體中文 / English).

## Development Commands

### Backend (Rust)
```bash
~/.cargo/bin/cargo build --release        # Build (release mode)
./target/release/backend                   # Run server on localhost:3000
~/.cargo/bin/cargo test                    # Run all tests
~/.cargo/bin/cargo test -p shared          # Test shared game logic only
~/.cargo/bin/cargo test -p backend         # Test backend only
```

### Frontend (React + Phaser)
```bash
cd frontend-new
npm install              # Install dependencies
npm run dev              # Dev server on localhost:5173
npm run build            # Production build (tsc + vite)
npm run preview          # Preview production build
```

### Docker
```bash
docker compose up -d     # Start both services
docker compose down      # Stop services
# Backend: localhost:3000, Frontend: localhost:8080
```

### Full Stack (Local Dev)
```bash
# Terminal 1: Backend
./target/release/backend
# Terminal 2: Frontend
cd frontend-new && npm run dev
# Access at http://localhost:5173
```

## Architecture

### Backend (Rust — Cargo Workspace)

- `crates/backend` — Axum web server with WebSocket handler
- `crates/shared` — Game logic (actions, cards, game state, player state)

**Key modules:**
- `websocket.rs` — WebSocket handler, processes `ClientMessage`, runs AI turn loop after each human action
- `events.rs` — `ClientMessage` (tagged enum) and `ServerMessage` type definitions
- `ai/simple.rs` — `SimpleAi` implementation (`decide_action()` for buy/play decisions)
- `shared/action.rs` — `PlayerAction` enum, validation, state mutations via `GameState::execute()`
- `shared/game.rs` — `GameState` struct, turn phases, supply management, game-over detection

### Frontend (React + Phaser 3 Hybrid)

Two rendering layers share state through Zustand:
- **React Layer** — UI overlays: TopBar, ActionLog, TurnControls, Modals, Toast, DeckAreas
- **Phaser Layer** — Game canvas: hand cards (draggable), supply area (clickable piles)
- **Zustand Stores** — `gameStore` (game state from server), `uiStore` (language, toasts, modals)

**Key modules:**
- `GameContainer.tsx` — React↔Phaser bridge; validates actions client-side, sends WebSocket messages, syncs state to Phaser scene via useEffect hooks
- `scenes/TableScene.ts` — Main Phaser scene; `updateHand()`, `updateSupply()`, `updateLanguage()`
- `objects/Card.ts` — Draggable card with hover/drag animations; stores `originalY` to prevent position drift
- `objects/Hand.ts` — Fan-arranged hand; `addCardSilent()` + `arrangeCards(animate)` for batch updates without fly-in
- `objects/SupplyPile.ts` — Clickable supply pile with hover lift; stores `originalY` for stable positioning
- `services/websocket.ts` — WebSocket client with auto-reconnect; URL auto-detected from `window.location`

### Data Flow

```
User clicks card → Phaser emits event → GameContainer validates →
  WebSocket send → Backend executes → AI turn loop runs →
  GameStateUpdate response → Zustand store update →
  React re-renders + Phaser scene.updateHand()/updateSupply()
```

Backend always responds with **full game state** (no deltas). Frontend replaces entire state on each message.

## Critical Implementation Details

### WebSocket Message Format
Backend uses Rust `#[serde(tag = "type")]` tagged enums. Frontend must send flat objects:
```typescript
{ type: 'BuyCard', card: 'Silver' }     // ✅ Correct
{ type: 'BuyCard', payload: { card: 'Silver' } }  // ❌ Wrong
```

### Card Action Routing
GameContainer routes card clicks by type:
- Treasure cards (Copper/Silver/Gold) → `PlayTreasure` (Buy phase, adds coins)
- Action cards → `PlayCard` (Action phase, uses an action)

### Complex Action Cards
Cards with multi-step UI (defined in `COMPLEX_ACTIONS` array in GameContainer):
- **Cellar** — Modal to select hand cards to discard
- **Workshop** — Modal to select supply card costing ≤4
- **Mine** — Two-step: trash a treasure, then gain one costing ≤ (trashed cost + 3)
- **Remodel** — Two-step: trash a card, then gain one costing ≤ (trashed cost + 2)
- **Militia** — Auto-sends, no modal needed (opponents choose discards server-side)

### AI Turn Loop (Server-Side)
After each human action in `websocket.rs`, the backend automatically runs AI turns:
1. Check if current player is AI (`player.is_ai`)
2. Call `SimpleAi::decide_action()` in a loop (max 20 actions)
3. If AI returns `None` or action errors, force `EndPhase`
4. Loop until it's a human player's turn again
5. Send final `GameStateUpdate` with all AI actions already applied

The frontend `AITurnController` is now a no-op — all AI logic is server-side.

### Phaser Object Patterns
- **Position drift prevention**: Card and SupplyPile store `originalY` at creation; hover tweens use absolute positions (`y: this.originalY - 10`), never relative
- **Batch hand updates**: `Hand.addCardSilent()` adds without animation; `Hand.arrangeCards(false)` positions instantly. Used by `TableScene.updateHand()` to avoid fly-in effects on state refresh
- **Scene listener setup**: GameContainer uses `requestAnimationFrame` polling to wait for `scene.hand` to exist before attaching event listeners

### Language Support
- Toggle via `uiStore.language` ('zh' | 'en')
- Card names: `getCardName(cardId, language)` from `cardData.ts`
- Phaser objects: `updateLanguage()` method called when language changes
- All React UI components read `language` from uiStore

### WebSocket URL Auto-Detection
`websocket.ts` derives URL from `window.location`:
- Dev (Vite proxy): `ws://localhost:5173/ws` → proxied to backend:3000
- Docker (nginx): `ws://localhost:8080/ws` → proxied to backend:3000
- HTTPS: automatically uses `wss://`

## Docker Deployment

- `Dockerfile.backend` — Rust multi-stage: `rust:1.83-slim` builder → `debian:bookworm-slim` runtime
- `Dockerfile.frontend` — `node:20-slim` builder → `nginx:alpine` runtime
- `nginx.conf` — Proxies `/api/` and `/ws` to backend service, SPA fallback for all other routes, 24h WebSocket timeout
- `docker-compose.yml` — Two services: `backend` (port 3000) and `frontend` (port 8080→80)

## Common Gotchas

**Backend:**
- `~/.cargo/bin/cargo` may be needed if cargo is not in PATH
- WebSocket handler creates a new game per connection (not persistent across reconnects)
- `parse_card()` in websocket.rs must match all card name strings exactly

**Frontend:**
- Hand cards are Phaser objects on canvas, NOT React components — click handling is via Phaser events
- Must call Phaser scene methods from React useEffect, never directly
- Toast notifications auto-dismiss after 3 seconds

**Integration:**
- Backend validation is authoritative; client-side validation is for UX only
- Frontend sends messages, backend always responds with full `GameStateUpdate`
- Both `Cargo.lock` and `package-lock.json` are committed for reproducible builds
