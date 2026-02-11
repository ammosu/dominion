# Dominion - 皇輿爭霸

A web-based implementation of the Dominion card game, featuring a Rust backend with WebSocket real-time communication and a React + Phaser 3 hybrid frontend. Play against an AI opponent with a medieval-themed UI.

## Screenshots

> Start a game and play against the AI bot in your browser.

## Features

- Real-time gameplay via WebSocket
- AI opponent with strategic card play (buy/action decisions)
- Bilingual UI (繁體中文 / English)
- Interactive hand cards rendered with Phaser 3
- Supply area with hover tooltips and card costs
- Discard pile viewer
- Game Over modal with final scores
- Sound effects toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, Axum, WebSocket, Tokio |
| Frontend | React 18, Phaser 3, Zustand, TypeScript |
| Bundler | Vite |
| Styling | CSS Modules |
| Deployment | Docker, nginx |

## Quick Start

### Docker (Recommended)

```bash
docker compose up -d
```

Open [http://localhost:8080](http://localhost:8080) to play.

### Local Development

**Prerequisites:** Rust toolchain, Node.js 20+

```bash
# Terminal 1: Backend
cargo build --release
./target/release/backend

# Terminal 2: Frontend
cd frontend-new
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to play.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (localhost:8080 or :5173)               │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │  React Layer   │  │    Phaser 3 Canvas     │  │
│  │  - TopBar      │  │    - Hand cards        │  │
│  │  - ActionLog   │  │    - Supply area       │  │
│  │  - Controls    │  │    - Animations        │  │
│  │  - Modals      │  │                        │  │
│  └───────┬───────┘  └───────────┬────────────┘  │
│          │    Zustand Store      │               │
│          └──────────┬───────────┘               │
│                     │ WebSocket                  │
└─────────────────────┼───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│  Rust Backend       │ (localhost:3000)           │
│  ┌──────────────────┴──────────────────────┐    │
│  │  Axum WebSocket Handler                  │    │
│  │  ┌─────────────┐  ┌──────────────────┐  │    │
│  │  │  Game Logic  │  │  AI (SimpleAi)   │  │    │
│  │  │  (shared)    │  │  decide_action() │  │    │
│  │  └─────────────┘  └──────────────────┘  │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

## Game Rules

Standard Dominion base game rules:

1. **Action Phase** - Play action cards (Village, Smithy, Market, etc.)
2. **Buy Phase** - Play treasure cards for coins, then buy cards from supply
3. **Cleanup** - Discard hand, draw 5 new cards

**Card Types:**
- **Treasure** (Copper / Silver / Gold) - Provide coins
- **Victory** (Estate / Duchy / Province) - Provide victory points
- **Action** (Village, Smithy, Market, etc.) - Special effects
- **Curse** - Negative victory points

The game ends when all Province cards are bought or 3 supply piles are empty. Highest score wins.

## Project Structure

```
Dominion/
├── crates/
│   ├── backend/         # Axum server, WebSocket, AI
│   └── shared/          # Game logic, cards, actions
├── frontend-new/
│   └── src/
│       ├── game/        # Phaser scenes & objects
│       ├── components/  # React UI components
│       ├── store/       # Zustand state management
│       ├── services/    # WebSocket client
│       └── utils/       # Card data, sounds
├── Dockerfile.backend   # Rust multi-stage build
├── Dockerfile.frontend  # Node build + nginx
├── docker-compose.yml   # Orchestration
├── nginx.conf           # Reverse proxy config
└── CLAUDE.md            # AI development guide
```

## License

MIT
