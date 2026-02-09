# Web Frontend Design

## Decisions

- Vanilla HTML/CSS/JS (no build step, no framework)
- Read-only game board view (no interactions yet)
- Clean & functional visual style, color-coded by card type

## Architecture

Static files in `frontend/` served by axum via `tower-http::ServeDir`. API stays under `/api/`.

```
frontend/
├── index.html
├── style.css
└── app.js
```

## Layout

1. **Turn Info Bar** — Current player, phase, actions/buys/coins counters
2. **Supply Area** — Grid of piles grouped by type, each showing name, cost, remaining count
3. **Your Hand** — Row of card rectangles along the bottom
4. **Player Sidebar** — All players with deck/discard/hand counts

## Colors

| Type    | Color family |
|---------|-------------|
| Treasure | Gold `#b8860b` |
| Victory  | Green `#2e7d32` |
| Action   | Blue `#1565c0` |
| Curse    | Purple `#6a1b9a` |

## Implementation Steps

1. Add `tower-http` dependency to backend, serve `frontend/` as static files with fallback to `index.html`
2. Create `frontend/index.html` — page skeleton with zones
3. Create `frontend/style.css` — card styles, layout grid, color coding
4. Create `frontend/app.js` — fetch `/api/game/new`, render all zones
5. Verify: `cargo run -p backend`, open browser, confirm board renders
