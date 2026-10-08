# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dominion card game implementation with Rust backend (Axum + WebSocket) and React + Phaser 3 frontend. Players can play against AI opponents in real-time with a medieval-themed UI. Supports bilingual interface (繁體中文 / English).

## Development Commands

### Backend (Rust)
```bash
# No local toolchain? Run the same commands in the Dockerfile's image:
#   docker run --rm -v "$PWD":/app -w /app -e CARGO_TARGET_DIR=/target -v dom-target:/target rust:1.83-slim cargo test
~/.cargo/bin/cargo build --release        # Build (release mode)
./target/release/backend                   # Run server on localhost:3000
~/.cargo/bin/cargo test                    # Run all tests
~/.cargo/bin/cargo test -p shared          # Test shared game logic only
~/.cargo/bin/cargo test -p backend         # Test backend only
~/.cargo/bin/cargo test --release -p backend ai_benchmark -- --ignored --nocapture  # MediumAi vs SimpleAi win rates
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
- `websocket.rs` — WebSocket handler; creates the game from `?difficulty=&kingdom=&name=`, runs `run_ai_turns` until the human must act
- `events.rs` — `ClientMessage` (tagged enum, card fields deserialize straight into `Card`) and `ServerMessage`
- `ai/mod.rs` — `AiPlayer` trait, shared turn logic, `resolve_decision()` answers for every decision kind, `run_ai_turns()`
- `ai/simple.rs` / `ai/medium.rs` — purchase strategies (Big Money vs. kingdom-aware)
- `shared/card.rs` — all 33 cards of the 2nd-edition base set, costs/types, `RECOMMENDED_KINGDOMS`
- `shared/decision.rs` — `Decision` (pending choice), `Purpose`, `Effect` (engine stack)
- `shared/action.rs` — `PlayerAction`, `GameState::execute(actor, action)`, every card's effect, attacks, clean-up
- `shared/game.rs` — `GameState`, setup by player count, game end, scoring (Gardens) and tie-break

### Frontend (React + Phaser 3 Hybrid)

Two rendering layers share state through Zustand:
- **React Layer** — UI overlays: TopBar, ActionLog, TurnControls, Modals, Toast, DeckAreas
- **Phaser Layer** — Game canvas: hand cards (draggable), supply area (clickable piles)
- **Zustand Stores** — `gameStore` (game state from server), `uiStore` (language, toasts, modals)

**Key modules:**
- `GameContainer.tsx` — React↔Phaser bridge; validates actions client-side, sends WebSocket messages, syncs the viewer's hand and the supply to Phaser
- `DecisionModal.tsx` — renders `pending_decision` for this player and answers with `Resolve`; the only card-choice UI
- `utils/cardData.ts` — card metadata, rulebook texts, `KINGDOM_PRESETS`; `utils/i18n.ts` — log/error/prompt translation
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

### Messages
Client → server: `PlayCard`, `PlayTreasure`, `PlayAllTreasures`, `BuyCard`, `EndPhase`, `Resolve { cards }`.
Server → client: `{ type: 'GameStateUpdate', payload: { game_state, viewer, error } }`; `error` is shown as a toast.

### Decisions (server-driven card choices)
Rules follow the official 2nd-edition rulebook. Playing a card pushes `Effect::Play` on the engine stack; when a card needs a choice the engine stores `pending_decision` (`player`, `source`, `purpose`, `options`, `min..max`) and stops. The owner answers with `Resolve { cards }` (a sub-multiset of `options`). While a decision is pending, nothing else may be done; only `decision.player` may answer (attacks target opponents). Yes/no choices are `options: [card], min 0, max 1`. Add a card by extending `resolve_card` / `apply_answer` in `action.rs` and `resolve_decision` in `ai/mod.rs` — never by adding client message types.

Rule notes: the game ends at the end of a turn; ties go to fewer turns; Moat is auto-revealed (it has no downside in this set); Treasures cannot be played after buying.

### AI Loop (Server-Side)
`run_ai_turns()` runs after every human message: while the acting player (decision owner, else current player) is an AI it answers the decision or takes a turn action. Rejected AI actions fall back to `EndPhase` / the minimal answer.

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
- Card ids are the Rust enum names (`CouncilRoom`, `ThroneRoom`); log lines use display names ("Council Room")

**Frontend:**
- Render `viewerPlayer` (this client), not `currentPlayer`: the human answers attacks during the AI's turn
- Card art: `tools/card-art/generate.py` (Codex CLI image generation, cute style in `style.md`, subjects in `cards.json`)
- Hand cards are Phaser objects on canvas, NOT React components — click handling is via Phaser events
- Must call Phaser scene methods from React useEffect, never directly
- Toast notifications auto-dismiss after 3 seconds

**Integration:**
- Backend validation is authoritative; client-side validation is for UX only
- Frontend sends messages, backend always responds with full `GameStateUpdate`
- Both `Cargo.lock` and `package-lock.json` are committed for reproducible builds
