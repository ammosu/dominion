# Design: Game Rules Explanation + AI Player System

**Date:** 2026-02-09
**Status:** Approved

## Overview

Add two major features to the Dominion game:
1. **Game Rules Explanation System** - Modal overlay with bilingual rules
2. **AI Player System** - Simple rule-based AI with extensible architecture

## Requirements

### Game Rules Explanation
- Modal/overlay display triggered from lobby and game screen
- Bilingual content (English/Traditional Chinese)
- Always accessible, non-intrusive to gameplay
- Covers: game goal, turn phases, card types, win conditions, basic strategy

### AI Player System
- Simple rule-based AI for initial implementation
- Extensible architecture for future AI improvements
- Each player slot can be configured as Human or AI
- Support 0-4 AI players (including full AI games)
- AI executes complete turns automatically on backend

## Architecture

### 1. Game Rules System

**Frontend Components:**
- `<div id="rules-modal">` - Modal overlay component
- CSS styling with semi-transparent backdrop
- Scrollable content area
- Close button and responsive design

**Data Structure:**
```javascript
const RULES_TEXT = {
  title: { en: "How to Play Dominion", zh: "如何遊玩皇輿爭霸" },
  sections: [
    {
      title: { en: "Game Goal", zh: "遊戲目標" },
      content: { en: "...", zh: "..." }
    },
    // More sections...
  ]
};
```

**Trigger Points:**
- Lobby screen: "📖 遊戲規則" button below title
- Game screen: "?" icon button in top-right toolbar

### 2. AI Player System Architecture

**Backend Structure:**
```
crates/
├── shared/src/
│   ├── ai.rs          // AiPlayer trait definition
│   └── player.rs      // Add is_ai: bool field
└── backend/src/
    └── ai/
        ├── mod.rs     // AiPlayer trait + utilities
        ├── simple.rs  // SimpleAi implementation
        └── [future: medium.rs, advanced.rs]
```

**Core Trait:**
```rust
pub trait AiPlayer: Send + Sync {
    fn decide_action(&self, game: &GameState, player_idx: usize)
        -> Option<PlayerAction>;
    fn name(&self) -> &str;
}
```

**Player Model Extension:**
```rust
pub struct Player {
    pub name: String,
    pub is_ai: bool,  // New field
    // ... existing fields
}
```

## SimpleAi Decision Logic

### Action Phase Strategy

**Card Priority:**
1. Village (for more actions)
2. Smithy (for card draw)
3. Market (balanced bonus)
4. Others

**Card-Specific Decisions:**
- **Cellar**: Discard all Victory cards and Curses
- **Workshop**: Prefer Silver, fallback to Estate
- **Mine**: Upgrade lowest treasure (Copper→Silver→Gold)
- **Remodel**: Trash Curse/low-value cards, gain Victory/Treasure cards
- **Militia**: Play immediately

### Buy Phase Strategy

**Purchase Priority (by coins available):**
- 8+ coins: Buy Province
- 6-7 coins: Buy Gold
- 5 coins: Buy Duchy
- 3-4 coins: Buy Silver
- 2 coins: Buy Estate
- Otherwise: Skip buying

**Late Game Adjustment:**
- When Province pile ≤ 4 remaining, prioritize Victory cards over Treasure

**Safety Limit:**
- Maximum 20 actions per AI turn to prevent infinite loops

## Frontend Integration

### Lobby Screen Changes

**HTML Structure:**
```html
<div class="player-input-row">
  <input type="text" class="player-name-input" placeholder="Player 1 name">
  <label class="ai-toggle">
    <input type="checkbox" class="ai-checkbox">
    <span>AI</span>
  </label>
</div>
```

**Game Creation Request:**
```json
{
  "players": [
    { "name": "Alice", "is_ai": false },
    { "name": "Bot", "is_ai": true }
  ]
}
```

### Game Screen AI Handling

**Visual Indicators:**
- 🤖 icon next to AI player names
- "AI 思考中..." / "AI thinking..." message during AI turns
- Log entries marked with "[AI]" prefix

**Turn Flow:**
1. Detect current player is AI
2. Display "AI thinking" message
3. Call `POST /api/game/{id}/ai-turn`
4. Backend executes full AI turn
5. Receive updated game state
6. Render next state (human player's turn)

## API Design

### Modified Endpoints

**POST /api/game/new**
```json
Request: {
  "players": [
    { "name": "string", "is_ai": bool },
    ...
  ]
}

Response: {
  "game_id": "string",
  "state": GameState
}
```

### New Endpoints

**POST /api/game/{id}/ai-turn**
- Executes complete AI turn (Action + Buy phases)
- Returns updated game state
- Returns error if current player is not AI

**GET /api/game/{id}** (unchanged)
- Used for polling game state updates

## Data Flow Example (1 Human vs 1 AI)

1. Alice (Human) starts game
2. Frontend renders Alice's turn
3. Alice plays cards, ends turn
4. Frontend sends `EndPhase`, backend switches to Bot
5. Frontend detects current player is AI
6. Frontend calls `POST /api/game/{id}/ai-turn`
7. Backend executes all Bot actions
8. Returns updated state (switched back to Alice)
9. Frontend renders Alice's turn again

## Error Handling

- AI decision failure: Log error, execute EndPhase
- Frontend timeout: Retry or show error message
- Invalid AI action: Skip and continue to next valid action

## Performance Considerations

- Add 0.5-1 second delay between AI actions for visibility
- Optional: Show AI actions step-by-step (can skip in v1)
- Limit AI decision time per turn

## Future Extensibility

**Adding New AI Strategies:**
1. Create new file: `backend/src/ai/medium.rs`
2. Implement `AiPlayer` trait
3. Add selection logic in game initialization
4. No changes to existing code required

**Potential Enhancements:**
- AI difficulty selection in lobby
- Different AI personalities (aggressive, defensive, balanced)
- AI player statistics and learning
- Save/load AI configurations

## Implementation Order

1. **Phase 1: Rules System**
   - Add rules modal HTML/CSS
   - Add bilingual rules content
   - Integrate buttons in lobby and game screen

2. **Phase 2: AI Foundation**
   - Add `is_ai` field to Player
   - Create AI trait and module structure
   - Modify `/api/game/new` to accept AI players

3. **Phase 3: SimpleAi Implementation**
   - Implement decision logic for all card types
   - Add `/api/game/{id}/ai-turn` endpoint
   - Test AI behavior

4. **Phase 4: Frontend Integration**
   - Add AI toggle in lobby
   - Add AI turn handling
   - Add visual indicators
   - Polish UI/UX

5. **Phase 5: Testing & Refinement**
   - Test various AI vs Human scenarios
   - Balance AI decision delays
   - Fix edge cases

## Success Criteria

- ✅ Players can view game rules at any time
- ✅ Rules are displayed in both English and Chinese
- ✅ Players can set any slot as Human or AI in lobby
- ✅ AI completes full turns without human intervention
- ✅ AI follows simple but reasonable strategy
- ✅ Architecture allows easy addition of new AI types
- ✅ Game remains playable and enjoyable with AI opponents
