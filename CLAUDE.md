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
- `crates/shared` — Game logic (actions, cards, game state, player state), AI, protocol and `Session` (one human-vs-AI game)
- `crates/wasm` — `WasmGame`: the same `Session` compiled to WebAssembly for the static GitHub Pages build

**Key modules:**
- `websocket.rs` — WebSocket handler; a thin loop around `shared::session::Session` (created from `?difficulty=&kingdom=&name=`)
- `shared/protocol.rs` — `ClientMessage` (tagged enum, card fields deserialize straight into `Card`) and `ServerMessage`
- `shared/session.rs` — game setup, `parse_kingdom`, and `handle(json)`: execute, then `run_ai_turns` until the human must act
- `shared/ai/mod.rs` — `AiPlayer` trait, shared turn logic, `resolve_decision()` answers for every decision kind, `run_ai_turns()`
- `shared/ai/simple.rs` / `shared/ai/medium.rs` — purchase strategies (Big Money vs. kingdom-aware)
- `shared/card.rs` — all 33 cards of the 2nd-edition base set, costs/types, `RECOMMENDED_KINGDOMS`
- `shared/decision.rs` — `Decision` (pending choice), `Purpose`, `Effect` (engine stack)
- `shared/event.rs` — `GameEvent` (Play, Draw, Gain, Discard, Trash, Attack, Blocked, Cleanup, TurnStart…): `GameState.events` lists what one client message and the AI turns it triggered did, in order (`Session` clears it per message); the client animates from it
- `shared/action.rs` — `PlayerAction`, `GameState::execute(actor, action)`, every card's effect, attacks, clean-up
- `shared/game.rs` — `GameState`, setup by player count, game end, scoring (Gardens) and tie-break

### Frontend (React + Phaser 3 Hybrid)

Two rendering layers share state through Zustand:
- **React Layer** — overlays on the table (PlayerPanel ×2, StatusBar, TrashPile, PlayedCards), the right-hand ActionLog column, modals, Toast
- **Phaser Layer** — Game canvas: hand (grouped by name, click to play) and Supply piles (click to buy)
- **Zustand Stores** — `gameStore` (game state from server), `uiStore` (language, toasts, modals)

**Key modules:**
- `GameContainer.tsx` — React↔Phaser bridge; validates actions client-side, sends WebSocket messages, syncs the viewer's hand and the supply to Phaser
- `DecisionModal.tsx` — renders `pending_decision` for this player and answers with `Resolve`; the only card-choice UI
- `utils/cardData.ts` — card metadata, rulebook texts, `KINGDOM_PRESETS`; `utils/i18n.ts` — log/error/prompt translation
- `scenes/TableScene.ts` — Main Phaser scene; `updateHand()`, `updateSupply()`, `updateLanguage()`
- `game/tableLayout.ts` — `computeTableLayout(w, h)`: the one source of table geometry for Phaser *and* React overlays (`useTableLayout` hook); `wide` mode (base cards left of the kingdom; 4×2 base when the table is short) or `portrait` mode (phones: kingdom 5×2 over base 4×2, player strips on top). `uiScale` (CSS var `--ui`) grows overlay text on big screens
- `objects/CardFace.ts` — card drawing shared by hand and supply: type-colored banner/label (`getCardFrameStyle`), artwork, cost coin, count badge, highlight
- `objects/Card.ts` / `Hand.ts` — one card per name in hand with a count; `SupplyPile.ts` / `SupplyArea.ts` — base grid (2 or 4 columns, trash in slot 7) + kingdom (5 columns)
- `components/GameUI/StatusBar.tsx` — Actions | Buys | Coins (pulse and float their change), prompt line, turn buttons and inline Yes/No decisions
- `fx/director.ts` + `fx/FxLayer.tsx` — plays `game_state.events` over the table after the new state is applied: cards fly (DOM ghosts, Web Animations) between hand, in-play row, Supply, deck/discard (`data-fx` anchors in PlayerPanel) and trash; attack streaks, Moat shield, turn banners. Another player's moves replay at a readable pace while `fxStore.busy` holds input, the decision modal and the game-over modal; a tap skips. `prefers-reduced-motion` skips flights
- `components/GameUI/Tutorial.tsx` — six-page how-to-play (`uiStore.showRulesModal`), opened from the start screen (glows until first seen, `localStorage`) and the side panel's ? button
- `components/GameUI/PlayedCards.tsx` — in-play row of small cards (`fx/miniCard.tsx`) in the space `tableLayout` leaves under the Supply; name chips when cramped
- `services/websocket.ts` — WebSocket client with auto-reconnect; URL auto-detected from `window.location`

### Data Flow

```
User clicks card → Phaser emits event → GameContainer validates →
  WebSocket send → Backend executes → AI turn loop runs →
  GameStateUpdate response → Zustand store update →
  React re-renders + Phaser scene.updateHand()/updateSupply() +
  playEvents(prev, next) animates next.events
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
- **High-DPI canvas**: `PhaserGame` sizes the canvas to the table column in device pixels (scale mode NONE, zoom 1/ratio, ResizeObserver); `TableScene` zooms its camera by the ratio so scene coordinates are CSS pixels. Never hard-code coordinates: take them from `computeTableLayout`, which React overlays also use, so both layers line up
- **Rebuild, don't move**: on resize or kingdom/hand change the scene destroys and rebuilds piles / hand cards; each object keeps the `baseY` it was built with for hover tweens, so positions cannot drift
- **Touch**: `objects/pointerBinding.ts` — mouse acts on press and previews on hover; touch acts on a short tap and previews on press-and-hold. Tapping a Supply pile opens `CardInspector` (details + Buy button, reason from `buyBlocker`) instead of buying. DOM cards (decision options, in-play chips) get the same hover / press-and-hold preview from `useCardPreview`
- **Narrow screens** (< 900px): the log column becomes a drawer opened from the status bar's ☰ button
- **Highlights**: GameContainer computes playable hand cards and buyable piles and calls `scene.setHighlights(buyable, playable)`
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

## GitHub Pages (static, no server)

`.github/workflows/pages.yml` deploys on every push to `main`: `cargo test`, `wasm-pack build crates/wasm` into `frontend-new/src/wasm/` (gitignored), then `VITE_ENGINE=wasm BASE_PATH=/<repo>/ npm run build`. With `VITE_ENGINE=wasm`, `wsService` is a `LocalEngineService` that runs `shared::session::Session` in the browser; the WebSocket server shares the same `Session`, so both modes play identically. Card art paths use `import.meta.env.BASE_URL`. Requires Settings → Pages → Source: GitHub Actions.

Build the wasm package locally (needs a recent stable Rust for wasm-pack's wasm-bindgen install; the workspace itself still builds on 1.83):
```bash
wasm-pack build crates/wasm --release --target web --no-pack --out-dir "$PWD/frontend-new/src/wasm"
cd frontend-new && VITE_ENGINE=wasm BASE_PATH=/dominion/ npm run build
```

## Docker Deployment

- `Dockerfile.backend` — Rust multi-stage: `rust:1.83-slim` builder → `debian:bookworm-slim` runtime
- `Dockerfile.frontend` — `node:20-slim` builder → `nginx:alpine` runtime
- `nginx.conf` — Proxies `/api/` and `/ws` to backend service, SPA fallback for all other routes, 24h WebSocket timeout
- `docker-compose.yml` — Two services: `backend` (port 3000) and `frontend` (port 8080→80)

## Common Gotchas

**Backend:**
- `~/.cargo/bin/cargo` may be needed if cargo is not in PATH
- Changing `GameState` (or any engine code) needs a `wasm-pack` rebuild before `VITE_ENGINE=wasm` dev picks it up; `frontend-new/src/wasm/` is a gitignored build artifact
- Log strings are parsed by `translateLogEntry`/`condenseLog`: change their wording only together with `i18n.ts`
- WebSocket handler creates a new game per connection (not persistent across reconnects)
- Card ids are the Rust enum names (`CouncilRoom`, `ThroneRoom`); log lines use display names ("Council Room")

**Frontend:**
- Render `viewerPlayer` (this client), not `currentPlayer`: the human answers attacks during the AI's turn
- Card art: several sets in `public/assets/cards/<style>/`, chosen in-game (`uiStore.artStyle`, saved to localStorage). Generate with `python3 tools/card-art/generate.py --style <name>` (Codex CLI; styles in `tools/card-art/styles/*.md`, subjects in `cards.json`), then add the style to `ART_STYLES` in `cardData.ts`. The start screen themes itself per style (`data-art` CSS variables in `StartScreen.module.css`) over `public/assets/backdrops/<style>-{wide,tall}.webp` from `generate.py --style <name> --backdrop` (a style can set the scene, e.g. time of day, with `<!-- backdrop: ... -->`) Phaser texture keys include the style; `TableScene.setArtStyle()` lazy-loads a set
- Hand cards are Phaser objects on canvas, NOT React components — click handling is via Phaser events
- Must call Phaser scene methods from React useEffect, never directly
- Toast notifications auto-dismiss after 3 seconds
- The WebSocket connection lives for the page; App only unsubscribes on unmount (so HMR doesn't drop the game)

**Integration:**
- Backend validation is authoritative; client-side validation is for UX only
- Frontend sends messages, backend always responds with full `GameStateUpdate`
- Both `Cargo.lock` and `package-lock.json` are committed for reproducible builds
