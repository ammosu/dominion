# Game Rules & AI Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add game rules modal and simple AI player system to enable single-player testing

**Architecture:** Frontend-only rules modal with bilingual content; Backend AI system using trait pattern for extensibility; SimpleAi implements rule-based decision logic executed server-side

**Tech Stack:** Rust (axum, serde), Vanilla JS, HTML/CSS

---

## Task 1: Add Rules Modal HTML and CSS

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/style.css`

**Step 1: Add rules modal HTML structure**

Add this HTML before the closing `</body>` tag in `frontend/index.html`:

```html
  <!-- Rules Modal -->
  <div id="rules-modal" class="hidden">
    <div class="modal-overlay" onclick="closeRulesModal()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="rules-title">How to Play Dominion</h2>
        <button class="modal-close" onclick="closeRulesModal()">✕</button>
      </div>
      <div id="rules-body" class="modal-body"></div>
    </div>
  </div>
```

**Step 2: Add rules button to lobby**

In `frontend/index.html`, modify the lobby section to add a rules button after the title:

```html
  <div id="lobby">
    <div id="lobby-box">
      <h1>Dominion</h1>
      <button id="rules-btn-lobby" class="secondary rules-btn">📖 <span class="rules-btn-text">Game Rules</span></button>
      <div id="player-inputs">
```

**Step 3: Add rules button to game screen**

In `frontend/index.html`, add rules button to the phase-buttons area (will be handled in JS):

```html
<!-- This will be added dynamically via JavaScript in renderTurnInfo -->
```

**Step 4: Add modal CSS styles**

Add to `frontend/style.css`:

```css
/* --- Rules Modal --- */
#rules-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
}

.modal-content {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 1.5rem;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--text);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.modal-close:hover {
  background: var(--border);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.rules-section {
  margin-bottom: 24px;
}

.rules-section h3 {
  color: var(--highlight);
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.rules-section p {
  line-height: 1.6;
  margin-bottom: 8px;
  color: var(--text-muted);
}

.rules-section ul {
  margin-left: 20px;
  line-height: 1.8;
  color: var(--text-muted);
}

.rules-btn {
  margin: 12px 0;
  padding: 10px 20px;
}

.rules-btn-text {
  margin-left: 4px;
}
```

**Step 5: Test modal styling**

Open `frontend/index.html` in browser, use browser dev tools to remove `hidden` class from `#rules-modal` and verify:
- Modal appears centered
- Overlay is semi-transparent
- Close button is visible
- Content area is scrollable

**Step 6: Commit**

```bash
git add frontend/index.html frontend/style.css
git commit -m "feat: add rules modal HTML structure and styling"
```

---

## Task 2: Add Rules Content and JavaScript

**Files:**
- Modify: `frontend/app.js`

**Step 1: Add rules content data structure**

Add after the `UI_TEXT` constant in `frontend/app.js`:

```javascript
const RULES_TEXT = {
  title: { en: "How to Play Dominion", zh: "如何遊玩皇輿爭霸" },
  sections: [
    {
      title: { en: "Game Goal", zh: "遊戲目標" },
      content: {
        en: "Accumulate the most Victory Points (VP) by the end of the game. Victory cards like Estate (+1 VP), Duchy (+3 VP), and Province (+6 VP) provide points. Beware of Curse cards (-1 VP)!",
        zh: "在遊戲結束時累積最多分數。分數卡如莊園（+1 分）、公國（+3 分）、行省（+6 分）提供分數。小心詛咒卡（-1 分）！"
      }
    },
    {
      title: { en: "Turn Structure", zh: "回合流程" },
      content: {
        en: "Each turn has three phases:\n\n1. **Action Phase**: Play one Action card from your hand (if you have Actions available). Some cards give you more Actions.\n\n2. **Buy Phase**: Play Treasure cards (Copper, Silver, Gold) to generate coins, then buy one card from the Supply (if you have Buys available).\n\n3. **Cleanup Phase**: Discard all cards in play and in your hand, then draw 5 new cards for your next turn.",
        zh: "每個回合有三個階段：\n\n1. **行動階段**：從手牌打出一張行動卡（如果你有行動次數）。某些卡片會給你更多行動次數。\n\n2. **購買階段**：打出財寶卡（銅幣、銀幣、金幣）產生金幣，然後從供應區購買一張卡片（如果你有購買次數）。\n\n3. **清場階段**：棄掉所有在場上和手牌的卡片，然後抽 5 張新牌作為下回合手牌。"
      }
    },
    {
      title: { en: "Card Types", zh: "卡片類型" },
      content: {
        en: "**Treasure Cards**: Provide coins for buying cards (Copper = 1 coin, Silver = 2 coins, Gold = 3 coins).\n\n**Victory Cards**: Provide Victory Points at the end of game (Estate = 1 VP, Duchy = 3 VP, Province = 6 VP).\n\n**Action Cards**: Provide special effects when played during Action Phase. Hover over any card to see its effect.\n\n**Curse Cards**: Negative Victory Points (-1 VP). Clutter your deck.",
        zh: "**財寶卡**：提供購買卡片所需的金幣（銅幣 = 1 金幣、銀幣 = 2 金幣、金幣 = 3 金幣）。\n\n**分數卡**：在遊戲結束時提供分數（莊園 = 1 分、公國 = 3 分、行省 = 6 分）。\n\n**行動卡**：在行動階段打出時提供特殊效果。將滑鼠移到任何卡片上查看效果。\n\n**詛咒卡**：負分數（-1 分）。會塞滿你的牌庫。"
      }
    },
    {
      title: { en: "Winning the Game", zh: "遊戲勝利" },
      content: {
        en: "The game ends when either:\n- The Province pile is empty, OR\n- Any 3 Supply piles are empty\n\nCount all Victory Points from cards in your deck, discard pile, and hand. The player with the most VP wins!",
        zh: "當以下情況發生時遊戲結束：\n- 行省堆空了，或\n- 任意 3 個供應堆空了\n\n計算你牌庫、棄牌堆和手牌中所有卡片的分數。分數最高的玩家獲勝！"
      }
    },
    {
      title: { en: "Basic Strategy", zh: "基本策略" },
      content: {
        en: "- **Early game**: Buy Silver and useful Action cards to build your deck engine.\n- **Mid game**: Balance between Treasure cards and Victory cards.\n- **Late game**: Focus on buying Province and Duchy for Victory Points.\n- **Key tip**: Victory cards don't help during the game - they only count at the end!",
        zh: "- **前期**：購買銀幣和有用的行動卡來建立你的牌庫引擎。\n- **中期**：在財寶卡和分數卡之間取得平衡。\n- **後期**：專注於購買行省和公國以獲得分數。\n- **關鍵提示**：分數卡在遊戲中沒有幫助 - 它們只在遊戲結束時計分！"
      }
    }
  ]
};
```

**Step 2: Add modal control functions**

Add these functions to `frontend/app.js`:

```javascript
function openRulesModal() {
  document.getElementById("rules-modal").classList.remove("hidden");
  renderRulesContent();
}

function closeRulesModal() {
  document.getElementById("rules-modal").classList.add("hidden");
}

function renderRulesContent() {
  const titleEl = document.getElementById("rules-title");
  const bodyEl = document.getElementById("rules-body");

  titleEl.textContent = RULES_TEXT.title[currentLang];

  bodyEl.innerHTML = "";
  for (const section of RULES_TEXT.sections) {
    const sectionEl = document.createElement("div");
    sectionEl.className = "rules-section";

    const titleEl = document.createElement("h3");
    titleEl.textContent = section.title[currentLang];
    sectionEl.appendChild(titleEl);

    const content = section.content[currentLang];
    const paragraphs = content.split("\n\n");

    for (const para of paragraphs) {
      const p = document.createElement("p");
      p.innerHTML = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      sectionEl.appendChild(p);
    }

    bodyEl.appendChild(sectionEl);
  }
}
```

**Step 3: Wire up rules button in lobby**

Add event listener in the init section at the bottom of `frontend/app.js`:

```javascript
document.getElementById("rules-btn-lobby").addEventListener("click", openRulesModal);
```

**Step 4: Add rules button to game screen**

Modify `renderTurnInfo()` function in `frontend/app.js` to add rules button to phase-buttons:

Find this section:
```javascript
  // Language toggle button
  const langBtn = document.createElement("button");
  langBtn.className = "secondary";
  langBtn.textContent = currentLang === "en" ? "中文" : "EN";
  langBtn.onclick = toggleLanguage;
  btns.appendChild(langBtn);
```

Add after it:
```javascript
  // Rules button
  const rulesBtn = document.createElement("button");
  rulesBtn.className = "secondary";
  rulesBtn.textContent = "?";
  rulesBtn.title = currentLang === "en" ? "Game Rules" : "遊戲規則";
  rulesBtn.onclick = openRulesModal;
  btns.appendChild(rulesBtn);
```

**Step 5: Update toggleLanguage to refresh rules**

Modify `toggleLanguage()` function to update rules modal if it's open:

```javascript
function toggleLanguage() {
  currentLang = currentLang === "en" ? "zh" : "en";
  localStorage.setItem("dominion-lang", currentLang);
  updateStaticText();
  if (game) render();
  // Update rules modal if it's open
  if (!document.getElementById("rules-modal").classList.contains("hidden")) {
    renderRulesContent();
  }
}
```

**Step 6: Update updateStaticText for rules button**

Add to `updateStaticText()` function:

```javascript
  // Rules button
  const rulesBtnText = document.querySelector("#rules-btn-lobby .rules-btn-text");
  if (rulesBtnText) {
    rulesBtnText.textContent = currentLang === "en" ? "Game Rules" : "遊戲規則";
  }
```

**Step 7: Test rules modal functionality**

Run: Start the server and open in browser
- Click "Game Rules" button in lobby → modal opens with English content
- Click "中文" → content switches to Chinese
- Click close button or overlay → modal closes
- Start a game → click "?" button → modal opens
- Verify scrolling works for long content

Expected: All tests pass

**Step 8: Commit**

```bash
git add frontend/app.js
git commit -m "feat: add rules modal content and JavaScript controls"
```

---

## Task 3: Add is_ai Field to Player Model

**Files:**
- Modify: `crates/shared/src/player.rs`

**Step 1: Add is_ai field to Player struct**

In `crates/shared/src/player.rs`, modify the `Player` struct:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    pub hand: Vec<Card>,
    pub deck: Vec<Card>,
    pub discard: Vec<Card>,
    pub actions: u32,
    pub buys: u32,
    pub coins: u32,
    pub is_ai: bool,  // Add this field
}
```

**Step 2: Update Player::new() to accept is_ai parameter**

Modify the `new` function signature and implementation:

```rust
impl Player {
    pub fn new(name: String, is_ai: bool) -> Self {
        let mut deck = vec![
            Card::Copper, Card::Copper, Card::Copper, Card::Copper,
            Card::Copper, Card::Copper, Card::Copper,
            Card::Estate, Card::Estate, Card::Estate,
        ];

        use rand::seq::SliceRandom;
        let mut rng = rand::thread_rng();
        deck.shuffle(&mut rng);

        let hand = deck.drain(0..5).collect();

        Player {
            name,
            hand,
            deck,
            discard: Vec::new(),
            actions: 1,
            buys: 1,
            coins: 0,
            is_ai,  // Add this field
        }
    }
    // ... rest of impl
}
```

**Step 3: Update GameState::new() to accept player info**

In `crates/shared/src/game.rs`, modify to accept structured player data:

```rust
#[derive(Debug, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub is_ai: bool,
}

impl GameState {
    pub fn new(player_info: Vec<PlayerInfo>) -> Self {
        let num_players = player_info.len();

        let players: Vec<Player> = player_info
            .into_iter()
            .map(|info| Player::new(info.name, info.is_ai))
            .collect();

        // ... rest of the function stays the same
    }
}
```

**Step 4: Update backend to use new API**

In `crates/backend/src/main.rs`, modify the `/api/game/new` endpoint:

Find:
```rust
#[derive(Deserialize)]
struct NewGameRequest {
    player_names: Vec<String>,
}
```

Replace with:
```rust
use shared::game::PlayerInfo;

#[derive(Deserialize)]
struct NewGameRequest {
    players: Vec<PlayerInfo>,
}
```

Find:
```rust
async fn new_game(Json(req): Json<NewGameRequest>) -> Json<NewGameResponse> {
    let game_state = GameState::new(req.player_names);
```

Replace with:
```rust
async fn new_game(Json(req): Json<NewGameRequest>) -> Json<NewGameResponse> {
    let game_state = GameState::new(req.players);
```

**Step 5: Export PlayerInfo from shared crate**

In `crates/shared/src/game.rs`, make sure PlayerInfo is public and exported:

```rust
// At the top of the file, ensure this is there
#[derive(Debug, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub is_ai: bool,
}
```

In `crates/shared/src/lib.rs`, export it:

```rust
pub use game::{GameState, PlayerInfo, Supply, TurnPhase};
```

**Step 6: Build and verify compilation**

Run: `cargo build`
Expected: Successful compilation with no errors

**Step 7: Commit**

```bash
git add crates/shared/src/player.rs crates/shared/src/game.rs crates/shared/src/lib.rs crates/backend/src/main.rs
git commit -m "feat: add is_ai field to Player model and update API"
```

---

## Task 4: Create AI Module Structure

**Files:**
- Create: `crates/backend/src/ai/mod.rs`
- Create: `crates/backend/src/ai/simple.rs`
- Modify: `crates/backend/src/main.rs`

**Step 1: Create AI module directory and mod.rs**

Create file `crates/backend/src/ai/mod.rs`:

```rust
use crate::shared::{action::PlayerAction, game::GameState};

pub mod simple;

/// Trait for AI player decision making
pub trait AiPlayer: Send + Sync {
    /// Decide the next action for the AI player
    /// Returns None if no valid action is available (should end phase)
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction>;

    /// Get the name/identifier of this AI
    fn name(&self) -> &str;
}
```

**Step 2: Create simple AI stub**

Create file `crates/backend/src/ai/simple.rs`:

```rust
use super::AiPlayer;
use crate::shared::{action::PlayerAction, game::GameState};

pub struct SimpleAi;

impl SimpleAi {
    pub fn new() -> Self {
        SimpleAi
    }
}

impl AiPlayer for SimpleAi {
    fn decide_action(&self, _game: &GameState, _player_idx: usize) -> Option<PlayerAction> {
        // Stub implementation - will be filled in next task
        None
    }

    fn name(&self) -> &str {
        "SimpleAi"
    }
}
```

**Step 3: Add AI module to backend**

In `crates/backend/src/main.rs`, add at the top with other module declarations:

```rust
mod ai;
```

**Step 4: Add shared import for convenience**

In `crates/backend/src/main.rs`, add after the existing use statements:

```rust
use shared as shared;  // Make shared accessible as crate::shared in AI modules
```

**Step 5: Build and verify**

Run: `cargo build`
Expected: Successful compilation

**Step 6: Commit**

```bash
git add crates/backend/src/ai/mod.rs crates/backend/src/ai/simple.rs crates/backend/src/main.rs
git commit -m "feat: create AI module structure with trait definition"
```

---

## Task 5: Implement SimpleAi Decision Logic - Action Phase

**Files:**
- Modify: `crates/backend/src/ai/simple.rs`

**Step 1: Add helper functions for action phase**

In `crates/backend/src/ai/simple.rs`, add implementation helpers:

```rust
use crate::shared::{
    action::PlayerAction,
    card::{Card, CardType},
    game::{GameState, TurnPhase},
};

impl SimpleAi {
    /// Check if player has any action cards in hand
    fn has_action_cards(game: &GameState, player_idx: usize) -> bool {
        game.players[player_idx]
            .hand
            .iter()
            .any(|c| c.card_type() == CardType::Action)
    }

    /// Get action cards sorted by priority
    fn get_prioritized_actions(game: &GameState, player_idx: usize) -> Vec<Card> {
        let hand = &game.players[player_idx].hand;
        let mut actions: Vec<Card> = hand
            .iter()
            .filter(|c| c.card_type() == CardType::Action)
            .copied()
            .collect();

        // Sort by priority: Village > Smithy > Market > others
        actions.sort_by_key(|card| match card {
            Card::Village => 0,
            Card::Smithy => 1,
            Card::Market => 2,
            _ => 3,
        });

        actions
    }

    /// Decide action for Cellar card
    fn decide_cellar(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Discard all Victory cards and Curses
        let discards: Vec<Card> = hand
            .iter()
            .filter(|c| {
                c.card_type() == CardType::Victory || c.card_type() == CardType::Curse
            })
            .copied()
            .collect();

        Some(PlayerAction::PlayCellar { discards })
    }

    /// Decide action for Workshop card
    fn decide_workshop(game: &GameState, _player_idx: usize) -> Option<PlayerAction> {
        // Priority: Silver > Estate
        if game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Some(PlayerAction::PlayWorkshop { gain: Card::Silver })
        } else if game.supply.get(&Card::Estate).copied().unwrap_or(0) > 0 {
            Some(PlayerAction::PlayWorkshop { gain: Card::Estate })
        } else {
            None
        }
    }

    /// Decide action for Mine card
    fn decide_mine(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Find lowest value treasure to upgrade
        let trash = if hand.contains(&Card::Copper) {
            Card::Copper
        } else if hand.contains(&Card::Silver) {
            Card::Silver
        } else {
            return None; // No treasures to trash
        };

        // Determine what to gain
        let max_cost = trash.cost() + 3;
        let gain = if max_cost >= 6 && game.supply.get(&Card::Gold).copied().unwrap_or(0) > 0 {
            Card::Gold
        } else if max_cost >= 3 && game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Card::Silver
        } else {
            return None;
        };

        Some(PlayerAction::PlayMine { trash, gain })
    }

    /// Decide action for Remodel card
    fn decide_remodel(game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let hand = &game.players[player_idx].hand;

        // Priority: Trash Curse > Trash lowest cost card
        let trash = if hand.contains(&Card::Curse) {
            Card::Curse
        } else {
            // Find lowest cost card
            hand.iter()
                .min_by_key(|c| c.cost())
                .copied()?
        };

        let max_cost = trash.cost() + 2;

        // Try to gain: Silver (3) > Estate (2)
        let gain = if max_cost >= 3 && game.supply.get(&Card::Silver).copied().unwrap_or(0) > 0 {
            Card::Silver
        } else if max_cost >= 2 && game.supply.get(&Card::Estate).copied().unwrap_or(0) > 0 {
            Card::Estate
        } else {
            return None;
        };

        Some(PlayerAction::PlayRemodel { trash, gain })
    }
}
```

**Step 2: Implement action phase decision logic**

Update the `decide_action` method in the AiPlayer impl:

```rust
impl AiPlayer for SimpleAi {
    fn decide_action(&self, game: &GameState, player_idx: usize) -> Option<PlayerAction> {
        let player = &game.players[player_idx];

        match game.phase {
            TurnPhase::Action => {
                // If no actions available, end phase
                if player.actions == 0 {
                    return Some(PlayerAction::EndPhase);
                }

                // If no action cards, end phase
                if !Self::has_action_cards(game, player_idx) {
                    return Some(PlayerAction::EndPhase);
                }

                // Get prioritized list of action cards
                let actions = Self::get_prioritized_actions(game, player_idx);

                // Play first available action card
                for card in actions {
                    match card {
                        Card::Cellar => return Self::decide_cellar(game, player_idx),
                        Card::Workshop => return Self::decide_workshop(game, player_idx),
                        Card::Mine => return Self::decide_mine(game, player_idx),
                        Card::Remodel => return Self::decide_remodel(game, player_idx),
                        Card::Militia => return Some(PlayerAction::PlayMilitia),
                        // Simple cards that don't require decisions
                        _ => return Some(PlayerAction::PlayCard { card }),
                    }
                }

                // No valid actions
                Some(PlayerAction::EndPhase)
            }
            TurnPhase::Buy => {
                // Will implement in next task
                Some(PlayerAction::EndPhase)
            }
            _ => None,
        }
    }

    fn name(&self) -> &str {
        "SimpleAi"
    }
}
```

**Step 3: Build and verify**

Run: `cargo build`
Expected: Successful compilation

**Step 4: Commit**

```bash
git add crates/backend/src/ai/simple.rs
git commit -m "feat: implement SimpleAi action phase decision logic"
```

---

## Task 6: Implement SimpleAi Decision Logic - Buy Phase

**Files:**
- Modify: `crates/backend/src/ai/simple.rs`

**Step 1: Add buy phase helper functions**

Add these functions to the `impl SimpleAi` block:

```rust
    /// Check if it's late game (Province pile low)
    fn is_late_game(game: &GameState) -> bool {
        game.supply.get(&Card::Province).copied().unwrap_or(0) <= 4
    }

    /// Decide what card to buy based on available coins
    fn decide_purchase(game: &GameState, player_idx: usize) -> Option<Card> {
        let player = &game.players[player_idx];
        let coins = player.coins;
        let is_late = Self::is_late_game(game);

        // Helper to check if card is available
        let available = |card: Card| -> bool {
            game.supply.get(&card).copied().unwrap_or(0) > 0
        };

        // Purchase priority based on coins
        if coins >= 8 && available(Card::Province) {
            Some(Card::Province)
        } else if coins >= 6 && !is_late && available(Card::Gold) {
            Some(Card::Gold)
        } else if coins >= 6 && is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 5 && is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 5 && !is_late && available(Card::Duchy) {
            Some(Card::Duchy)
        } else if coins >= 3 && available(Card::Silver) {
            Some(Card::Silver)
        } else if coins >= 2 && available(Card::Estate) {
            Some(Card::Estate)
        } else {
            None
        }
    }
```

**Step 2: Update decide_action to handle Buy phase**

Replace the Buy phase section in `decide_action`:

```rust
            TurnPhase::Buy => {
                let player = &game.players[player_idx];

                // First, play all treasure cards if we haven't
                let has_treasures = player.hand.iter().any(|c| c.card_type() == CardType::Treasure);
                if has_treasures {
                    return Some(PlayerAction::PlayAllTreasures);
                }

                // Then try to buy something
                if player.buys > 0 {
                    if let Some(card) = Self::decide_purchase(game, player_idx) {
                        return Some(PlayerAction::BuyCard { card });
                    }
                }

                // No more actions, end turn
                Some(PlayerAction::EndPhase)
            }
```

**Step 3: Build and verify**

Run: `cargo build`
Expected: Successful compilation

**Step 4: Commit**

```bash
git add crates/backend/src/ai/simple.rs
git commit -m "feat: implement SimpleAi buy phase decision logic"
```

---

## Task 7: Add AI Turn Execution Endpoint

**Files:**
- Modify: `crates/backend/src/main.rs`

**Step 1: Add AI turn handler function**

In `crates/backend/src/main.rs`, add this function before the `main` function:

```rust
use ai::{simple::SimpleAi, AiPlayer};
use std::thread;
use std::time::Duration;

async fn execute_ai_turn(
    Path(game_id): Path<String>,
    State(games): State<Arc<Mutex<HashMap<String, GameState>>>>,
) -> Result<Json<GameState>, StatusCode> {
    let ai = SimpleAi::new();
    const MAX_ACTIONS: usize = 20;

    for _ in 0..MAX_ACTIONS {
        let mut games = games.lock().unwrap();
        let game = games.get_mut(&game_id).ok_or(StatusCode::NOT_FOUND)?;

        let current_player_idx = game.current_player;
        let is_ai = game.players[current_player_idx].is_ai;

        // Only execute if current player is AI
        if !is_ai {
            return Ok(Json(game.clone()));
        }

        // Get AI decision
        let action = match ai.decide_action(game, current_player_idx) {
            Some(action) => action,
            None => {
                // No valid action, end phase
                PlayerAction::EndPhase
            }
        };

        // Execute the action
        if let Err(e) = execute_action(game, &action) {
            eprintln!("AI action failed: {}", e);
            // On error, try to end phase
            let _ = execute_action(game, &PlayerAction::EndPhase);
            return Ok(Json(game.clone()));
        }

        // Small delay to make AI visible
        drop(games); // Release lock before sleep
        thread::sleep(Duration::from_millis(500));

        // Check if turn ended (switched to another player or still AI's turn)
        let games = games.lock().unwrap();
        let game = games.get(&game_id).ok_or(StatusCode::NOT_FOUND)?;
        let new_player_idx = game.current_player;

        // If player changed or new player is not AI, we're done
        if new_player_idx != current_player_idx || !game.players[new_player_idx].is_ai {
            return Ok(Json(game.clone()));
        }
    }

    // Safety limit reached
    let games = games.lock().unwrap();
    let game = games.get(&game_id).ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(game.clone()))
}
```

**Step 2: Add route for AI turn endpoint**

In the `main` function, add the new route after the existing game routes:

Find:
```rust
        .route("/api/game/:id", get(get_game))
        .route("/api/game/:id/action", post(game_action))
```

Add after:
```rust
        .route("/api/game/:id/ai-turn", post(execute_ai_turn))
```

**Step 3: Build and verify**

Run: `cargo build`
Expected: Successful compilation

**Step 4: Commit**

```bash
git add crates/backend/src/main.rs
git commit -m "feat: add AI turn execution endpoint"
```

---

## Task 8: Update Frontend - Lobby AI Toggles

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/style.css`
- Modify: `frontend/app.js`

**Step 1: Update lobby HTML with AI toggles**

In `frontend/index.html`, replace the player inputs section:

```html
      <div id="player-inputs">
        <div class="player-input-row">
          <input type="text" class="player-name-input" placeholder="Player 1 name" value="Alice">
          <label class="ai-toggle">
            <input type="checkbox" class="ai-checkbox">
            <span class="ai-label">AI</span>
          </label>
        </div>
        <div class="player-input-row">
          <input type="text" class="player-name-input" placeholder="Player 2 name" value="Bot">
          <label class="ai-toggle">
            <input type="checkbox" class="ai-checkbox" checked>
            <span class="ai-label">AI</span>
          </label>
        </div>
      </div>
```

**Step 2: Add CSS for AI toggles**

Add to `frontend/style.css`:

```css
.player-input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.player-input-row .player-name-input {
  flex: 1;
}

.ai-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  transition: background 0.15s;
}

.ai-toggle:hover {
  background: var(--surface);
}

.ai-toggle input[type="checkbox"] {
  cursor: pointer;
}

.ai-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.ai-toggle input[type="checkbox"]:checked ~ .ai-label {
  color: var(--action);
}
```

**Step 3: Update app.js to send player info with AI flags**

In `frontend/app.js`, modify the start game button handler:

```javascript
document.getElementById("start-game-btn").addEventListener("click", async () => {
  const rows = document.querySelectorAll(".player-input-row");
  const players = [];

  for (const row of rows) {
    const nameInput = row.querySelector(".player-name-input");
    const aiCheckbox = row.querySelector(".ai-checkbox");
    const name = nameInput.value.trim();

    if (name) {
      players.push({
        name: name,
        is_ai: aiCheckbox.checked
      });
    }
  }

  if (players.length < 2) {
    alert(currentLang === "zh" ? "請輸入至少 2 位玩家名稱" : "Enter at least 2 player names");
    return;
  }

  const data = await apiPost("/api/game/new", { players });
  gameId = data.game_id;
  game = data.state;

  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  render();

  // Check if first player is AI and trigger AI turn
  checkAndExecuteAiTurn();
});
```

**Step 4: Add updateStaticText update for AI label**

In `updateStaticText()` function, add:

```javascript
  // AI labels
  document.querySelectorAll(".ai-label").forEach(label => {
    label.textContent = currentLang === "zh" ? "電腦" : "AI";
  });
```

**Step 5: Test lobby UI**

Start server and open in browser:
- Verify two player input rows with AI checkboxes
- Check second player checkbox is checked by default
- Toggle checkboxes - styling should update
- Switch language - "AI" should change to "電腦"

Expected: All visual tests pass

**Step 6: Commit**

```bash
git add frontend/index.html frontend/style.css frontend/app.js
git commit -m "feat: add AI toggle controls in lobby"
```

---

## Task 9: Add AI Turn Execution in Frontend

**Files:**
- Modify: `frontend/app.js`

**Step 1: Add AI turn execution function**

Add this function to `frontend/app.js`:

```javascript
async function checkAndExecuteAiTurn() {
  if (!game || game.game_over) return;

  const currentPlayer = game.players[game.current_player];

  if (currentPlayer.is_ai) {
    try {
      // Show AI thinking message
      showAiThinking();

      // Execute AI turn
      game = await apiPost(`/api/game/${gameId}/ai-turn`, {});

      render();

      if (game.game_over) {
        showGameOver();
      } else {
        // Check if next player is also AI
        setTimeout(checkAndExecuteAiTurn, 300);
      }
    } catch (e) {
      showError(e.message);
    }
  }
}

function showAiThinking() {
  const entries = document.getElementById("log-entries");
  const el = document.createElement("div");
  el.className = "log-entry ai-thinking";
  el.style.color = "var(--action)";
  el.textContent = currentLang === "zh" ? "🤖 AI 思考中..." : "🤖 AI thinking...";
  entries.appendChild(el);
  entries.scrollTop = entries.scrollHeight;
}
```

**Step 2: Modify sendAction to trigger AI check**

Update the `sendAction` function to check for AI after human actions:

```javascript
async function sendAction(action) {
  try {
    game = await apiPost(`/api/game/${gameId}/action`, action);
    uiMode = "normal";
    cellarSelected.clear();
    pendingTrash = null;
    render();
    if (game.game_over) {
      showGameOver();
    } else {
      // Check if next player is AI
      checkAndExecuteAiTurn();
    }
  } catch (e) {
    showError(e.message);
  }
}
```

**Step 3: Add AI indicator to player names**

Modify `renderPlayers()` function to show AI indicator:

```javascript
function renderPlayers() {
  const list = document.getElementById("players-list");
  list.innerHTML = "";

  game.players.forEach((player, i) => {
    const card = document.createElement("div");
    card.className = `player-card${i === game.current_player ? " active" : ""}`;
    const aiIcon = player.is_ai ? " 🤖" : "";
    card.innerHTML = `
      <div class="player-name">${player.name}${aiIcon}${i === game.current_player ? " ★" : ""}</div>
      <div class="player-stats">
        <div class="stat"><span>${t("hand")}</span><span>${player.hand.length}</span></div>
        <div class="stat"><span>${t("deck")}</span><span>${player.deck.length}</span></div>
        <div class="stat"><span>${t("discard")}</span><span>${player.discard.length}</span></div>
      </div>
    `;
    list.appendChild(card);
  });
}
```

**Step 4: Add AI prefix to log entries**

This will be handled by backend in the next task, but prepare frontend to display it correctly.

**Step 5: Test AI turn execution**

Start server, create game with 1 human + 1 AI:
- Start game
- Complete your turn (play cards, end turn)
- Verify "AI thinking..." message appears
- Verify AI completes its turn automatically
- Verify game state updates
- Verify it's back to your turn

Expected: AI plays automatically without manual intervention

**Step 6: Commit**

```bash
git add frontend/app.js
git commit -m "feat: add automatic AI turn execution in frontend"
```

---

## Task 10: Polish and Testing

**Files:**
- Modify: `crates/backend/src/main.rs`
- Test various scenarios

**Step 1: Add AI action logging to backend**

In `crates/backend/src/main.rs`, modify the `execute_action` function to add AI prefix to log entries.

Find where log entries are added (search for `game.log.push`) and wrap with AI check:

```rust
// Example for one log entry - apply pattern to all log entries
fn log_ai_action(game: &mut GameState, message: String) {
    let player = &game.players[game.current_player];
    if player.is_ai {
        game.log.push(format!("[AI] {}", message));
    } else {
        game.log.push(message);
    }
}
```

Then replace direct `game.log.push()` calls with `log_ai_action()` calls.

**Step 2: Test human vs AI game**

Run full game test:
1. Start server: `cargo run -p backend`
2. Open browser to `http://localhost:3000`
3. Set Player 1 = Human, Player 2 = AI
4. Play complete game
5. Verify:
   - AI takes turns automatically
   - AI makes reasonable decisions
   - Log shows [AI] prefix for AI actions
   - Game ends correctly
   - Scores are calculated

Expected: Complete game plays smoothly

**Step 3: Test AI vs AI game**

1. Set both players as AI
2. Start game
3. Watch game play automatically
4. Verify it completes without errors

Expected: Game completes automatically

**Step 4: Test rules modal**

1. Open rules in lobby (both languages)
2. Open rules during game (both languages)
3. Switch language while modal is open
4. Close modal with button and overlay click

Expected: All rules functionality works

**Step 5: Test edge cases**

- Start game with 0 AI (should work as before)
- Start game with 4 AI
- AI runs out of cards to buy
- AI with no valid actions

Expected: All cases handled gracefully

**Step 6: Final polish - adjust AI delay if needed**

In `execute_ai_turn` function, adjust the delay if it's too fast/slow:

```rust
thread::sleep(Duration::from_millis(800)); // Adjust as needed
```

**Step 7: Commit**

```bash
git add crates/backend/src/main.rs
git commit -m "feat: add AI action logging and final polish"
```

**Step 8: Final test and verification**

Run complete verification:
- Build: `cargo build`
- Start server: `cargo run -p backend`
- Test all scenarios above
- Verify all success criteria from design doc

Expected: All features working correctly

---

## Success Criteria Verification

✅ Players can view game rules at any time
✅ Rules are displayed in both English and Chinese
✅ Players can set any slot as Human or AI in lobby
✅ AI completes full turns without human intervention
✅ AI follows simple but reasonable strategy
✅ Architecture allows easy addition of new AI types
✅ Game remains playable and enjoyable with AI opponents

## Next Steps

After implementation:
1. Play several test games to verify AI behavior
2. Consider adjusting AI strategy based on playtesting
3. Future: Add medium/advanced AI by implementing new structs with AiPlayer trait
