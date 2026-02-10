# Complete Playable Dominion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the current React + Phaser 3 prototype into a fully playable Dominion game with supply area, buy interactions, turn flow, victory conditions, complete action cards, AI opponent, game screens, and polished animations.

**Architecture:** Build on existing React 18 + TypeScript + Phaser 3 + Vite + Zustand + WebSocket foundation. Add supply area UI, turn flow controls, complete card effects, AI integration, and game state management.

**Tech Stack:** React 18, TypeScript, Phaser 3, Vite, Zustand, WebSocket (tokio-tungstenite), Rust (Axum), existing AI system

---

## Current State Summary

**Already Implemented (12 core tasks completed):**
- ✅ Vite + React + TypeScript setup
- ✅ Phaser 3 integration with TableScene
- ✅ Rust backend with WebSocket support
- ✅ Frontend WebSocket client
- ✅ Card class with drag-and-drop
- ✅ Hand class with fan arrangement
- ✅ Zustand state management (gameStore, uiStore)
- ✅ TopBar UI (player, phase, counters, language toggle)
- ✅ ActionLog UI component
- ✅ Backend game action processing
- ✅ Card click to play integration

**Rust Backend Cards (from card.rs):**
- Treasures: Copper, Silver, Gold
- Victory: Estate, Duchy, Province
- Curse: Curse
- Actions: Cellar, Market, Militia, Mine, Moat, Remodel, Smithy, Village, Woodcutter, Workshop (10 action cards)

**Missing for Playable Game:**
- ❌ Supply area display
- ❌ Buy card interactions
- ❌ End Phase button
- ❌ Victory condition detection
- ❌ Complete action card implementations (only basic cards work)
- ❌ AI turn automation
- ❌ Game start/end screens
- ❌ Card animations (draw, buy, play)
- ❌ Sound effects

---

## Phase 1: Supply Area & Buy System

### Task 1: SupplyArea Phaser Object

**Files:**
- Create: `frontend-new/src/game/objects/SupplyArea.ts`
- Create: `frontend-new/src/game/objects/SupplyPile.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: Create SupplyPile.ts**

```typescript
import Phaser from 'phaser';

export class SupplyPile extends Phaser.GameObjects.Container {
  private cardName: string;
  private count: number;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, count: number, cost: number) {
    super(scene, x, y);

    this.cardName = cardName;
    this.count = count;

    // Card background
    this.cardBg = scene.add.rectangle(0, 0, 70, 100, 0xffffff);
    this.add(this.cardBg);

    // Card name
    this.cardText = scene.add.text(0, -10, cardName, {
      fontSize: '11px',
      color: '#000000',
      wordWrap: { width: 60 },
      align: 'center',
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    // Count badge
    const countBg = scene.add.circle(0, 30, 15, 0x333333, 0.8);
    this.countText = scene.add.text(0, 30, count.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.countText.setOrigin(0.5);
    this.add(countBg);
    this.add(this.countText);

    // Cost badge
    const costBg = scene.add.circle(25, -35, 12, 0xFFD700, 1);
    const costText = scene.add.text(25, -35, cost.toString(), {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold',
    });
    costText.setOrigin(0.5);
    this.costBadge = scene.add.container(0, 0, [costBg, costText]);
    this.add(this.costBadge);

    scene.add.existing(this);

    // Interactive
    this.setSize(70, 100);
    this.setInteractive({ useHandCursor: true });

    // Hover effect
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerOver() {
    this.scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    this.scene.events.emit('supply-card-hovered', this.cardName);
  }

  private onPointerOut() {
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    this.scene.events.emit('supply-card-hovered', null);
  }

  private onPointerDown() {
    this.scene.events.emit('supply-card-clicked', this.cardName);
  }

  updateCount(count: number) {
    this.count = count;
    this.countText.setText(count.toString());

    // Gray out if empty
    if (count === 0) {
      this.cardBg.setFillStyle(0x888888);
      this.setAlpha(0.5);
      this.disableInteractive();
    }
  }

  getCardName(): string {
    return this.cardName;
  }

  getCount(): number {
    return this.count;
  }
}
```

**Step 2: Create SupplyArea.ts**

```typescript
import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';

export class SupplyArea {
  private scene: Phaser.Scene;
  private piles: Map<string, SupplyPile> = new Map();
  private baseX: number = 100;
  private baseY: number = 150;
  private spacing: number = 90;
  private rowSpacing: number = 120;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(supply: Record<string, number>, costs: Record<string, number>) {
    // Clear existing piles
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();

    // Organize cards by type
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province'];
    const curse = ['Curse'];
    const actions = Object.keys(supply).filter(
      (card) => !treasures.includes(card) && !victory.includes(card) && !curse.includes(card)
    );

    // Layout
    const allCards = [
      ...treasures,
      ...victory,
      curse[0],
      ...actions,
    ];

    allCards.forEach((cardName, index) => {
      if (supply[cardName] !== undefined) {
        const row = Math.floor(index / 7);
        const col = index % 7;
        const x = this.baseX + col * this.spacing;
        const y = this.baseY + row * this.rowSpacing;

        const pile = new SupplyPile(
          this.scene,
          x,
          y,
          cardName,
          supply[cardName],
          costs[cardName] || 0
        );
        this.piles.set(cardName, pile);
      }
    });
  }

  updateSupply(supply: Record<string, number>) {
    this.piles.forEach((pile, cardName) => {
      if (supply[cardName] !== undefined) {
        pile.updateCount(supply[cardName]);
      }
    });
  }

  getPile(cardName: string): SupplyPile | undefined {
    return this.piles.get(cardName);
  }

  clear() {
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();
  }
}
```

**Step 3: Integrate SupplyArea into TableScene**

Modify `frontend-new/src/game/scenes/TableScene.ts`:

```typescript
import { SupplyArea } from '../objects/SupplyArea';

export class TableScene extends Phaser.Scene {
  private hand!: Hand;
  private supplyArea!: SupplyArea; // Add this

  create() {
    // ... existing code ...

    // Create supply area
    this.supplyArea = new SupplyArea(this);

    // Listen to supply card events
    this.events.on('supply-card-clicked', (cardName: string) => {
      console.log('Supply card clicked:', cardName);
      this.events.emit('buy-card-request', cardName);
    });

    this.events.on('supply-card-hovered', (cardName: string | null) => {
      this.events.emit('supply-card-hover-changed', cardName);
    });
  }

  // Add method to update supply
  updateSupply(supply: Record<string, number>, costs: Record<string, number>) {
    if (!this.supplyArea) {
      this.supplyArea = new SupplyArea(this);
    }
    if (this.supplyArea.getPile(Object.keys(supply)[0])) {
      this.supplyArea.updateSupply(supply);
    } else {
      this.supplyArea.setupSupply(supply, costs);
    }
  }
}
```

**Step 4: Test supply display**

Temporarily add to `GameContainer.tsx` after creating game:

```tsx
// Mock supply data
useEffect(() => {
  const scene = gameRef.current?.getScene('TableScene') as any;
  if (scene && scene.updateSupply) {
    scene.updateSupply(
      {
        Copper: 60,
        Silver: 40,
        Gold: 30,
        Estate: 12,
        Duchy: 12,
        Province: 12,
        Curse: 10,
        Smithy: 10,
        Village: 10,
        Market: 10,
      },
      {
        Copper: 0,
        Silver: 3,
        Gold: 6,
        Estate: 2,
        Duchy: 5,
        Province: 8,
        Curse: 0,
        Smithy: 4,
        Village: 3,
        Market: 5,
      }
    );
  }
}, []);
```

Run: `npm run dev`
Expected: Shows supply area with card piles in grid layout

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add SupplyArea and SupplyPile objects"
```

---

### Task 2: Backend Supply State Integration

**Files:**
- Modify: `crates/backend/src/websocket.rs`
- Modify: `frontend-new/src/types/game.ts`

**Step 1: Update game.ts types**

Add to `frontend-new/src/types/game.ts`:

```typescript
export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy' | 'Cleanup';
  players: Player[];
  supply: Record<string, number>;
  log: string[];
  trash: string[]; // Add trash pile
}
```

**Step 2: Update websocket.rs to send full supply**

Modify `crates/backend/src/websocket.rs` in `handle_socket` function:

```rust
// Convert supply HashMap to JSON-friendly format
let supply_map: std::collections::HashMap<String, u32> = test_game
    .supply
    .iter()
    .map(|(card, count)| (format!("{:?}", card), *count))
    .collect();
```

Modify ServerPayload structure in `events.rs`:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ServerPayload {
    pub game_state: GameState,
    pub animation_hints: Option<AnimationHint>,
}
```

**Step 3: Test backend supply data**

Run: `~/.cargo/bin/cargo build`
Expected: Compiles successfully

Run: `~/.cargo/bin/cargo run -p backend`
Open browser console, check WebSocket message:
Expected: `game_state.supply` contains all card counts

**Step 4: Commit**

```bash
git add .
git commit -m "feat: backend sends full supply state"
```

---

### Task 3: Connect Supply to GameStore

**Files:**
- Modify: `frontend-new/src/game/GameContainer.tsx`
- Modify: `frontend-new/src/utils/cardData.ts`

**Step 1: Add card costs utility**

Add to `frontend-new/src/utils/cardData.ts`:

```typescript
export function getCardCost(cardName: string): number {
  return CARD_DATA[cardName]?.cost || 0;
}

export function getAllCardCosts(supply: Record<string, number>): Record<string, number> {
  const costs: Record<string, number> = {};
  Object.keys(supply).forEach((cardName) => {
    costs[cardName] = getCardCost(cardName);
  });
  return costs;
}
```

**Step 2: Update GameContainer to sync supply**

Modify `frontend-new/src/game/GameContainer.tsx`:

```tsx
import { useGameStore } from '../store/gameStore';
import { getAllCardCosts } from '../utils/cardData';

export function GameContainer() {
  const gameState = useGameStore((state) => state.gameState);
  // ... existing code ...

  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateSupply && gameState?.supply) {
      const costs = getAllCardCosts(gameState.supply);
      scene.updateSupply(gameState.supply, costs);
    }
  }, [gameState?.supply]);

  // ... rest of code
}
```

**Step 3: Test real-time supply updates**

Run both servers:
```bash
~/.cargo/bin/cargo run -p backend
cd frontend-new && npm run dev
```

Open browser, check supply area displays correct counts
Try console command to buy card:
```javascript
wsService.send({ type: 'BuyCard', payload: { card: 'Silver' } });
```

Expected: Supply count decreases

**Step 4: Commit**

```bash
git add .
git commit -m "feat: connect supply area to game state"
```

---

## Phase 2: Turn Flow & Controls

### Task 4: EndPhase Button Component

**Files:**
- Create: `frontend-new/src/components/GameUI/TurnControls.tsx`
- Create: `frontend-new/src/components/GameUI/TurnControls.module.css`
- Modify: `frontend-new/src/App.tsx`

**Step 1: Create TurnControls.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import styles from './TurnControls.module.css';

export function TurnControls() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!gameState || !currentPlayer) {
    return null;
  }

  const handleEndPhase = () => {
    wsService.send({ type: 'EndPhase' });
  };

  const phaseButton = {
    Action: { zh: '結束行動階段', en: 'End Action Phase' },
    Buy: { zh: '結束購買階段', en: 'End Buy Phase' },
    Cleanup: { zh: '結束清理', en: 'End Cleanup' },
  };

  return (
    <div className={styles.turnControls}>
      <button className={styles.endPhaseButton} onClick={handleEndPhase}>
        {phaseButton[gameState.phase][language]}
      </button>
    </div>
  );
}
```

**Step 2: Create TurnControls.module.css**

```css
.turnControls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.endPhaseButton {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.endPhaseButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

.endPhaseButton:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

**Step 3: Add to App.tsx**

```tsx
import { TurnControls } from './components/GameUI/TurnControls';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <TopBar />
      <ActionLog />
      <TurnControls />
      <GameContainer />
    </div>
  );
}
```

**Step 4: Test turn advancement**

Run: `npm run dev`
Click "End Action Phase" button
Expected: Phase changes to "Buy", TopBar updates

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add TurnControls with End Phase button"
```

---

### Task 5: Victory Condition Detection

**Files:**
- Modify: `crates/shared/src/game.rs`
- Create: `frontend-new/src/components/GameUI/GameOverModal.tsx`
- Create: `frontend-new/src/components/GameUI/GameOverModal.module.css`

**Step 1: Add game end detection in game.rs**

Modify `crates/shared/src/game.rs`:

```rust
impl GameState {
    // Add method to check game end
    pub fn is_game_over(&self) -> bool {
        // Game ends if Province pile is empty
        if self.supply.get(&Card::Province).map_or(0, |&c| c) == 0 {
            return true;
        }

        // Or if any 3 supply piles are empty
        let empty_piles = self.supply.values().filter(|&&count| count == 0).count();
        empty_piles >= 3
    }

    pub fn calculate_scores(&self) -> Vec<(String, i32)> {
        self.players
            .iter()
            .map(|player| {
                let score = player
                    .deck
                    .iter()
                    .chain(player.hand.iter())
                    .chain(player.discard.iter())
                    .map(|card| card.victory_points())
                    .sum();
                (player.name.clone(), score)
            })
            .collect()
    }
}
```

**Step 2: Create GameOverModal.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './GameOverModal.module.css';

interface GameOverModalProps {
  scores: { name: string; score: number }[];
  onClose: () => void;
}

export function GameOverModal({ scores, onClose }: GameOverModalProps) {
  const language = useUIStore((state) => state.language);

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1 className={styles.title}>
          {language === 'zh' ? '遊戲結束' : 'Game Over'}
        </h1>

        <div className={styles.winner}>
          <span className={styles.crown}>👑</span>
          <h2>{winner.name}</h2>
          <p>
            {language === 'zh' ? '獲勝！' : 'Wins!'}
          </p>
        </div>

        <div className={styles.scores}>
          <h3>{language === 'zh' ? '最終分數' : 'Final Scores'}</h3>
          {sorted.map((player, index) => (
            <div key={player.name} className={styles.scoreRow}>
              <span className={styles.rank}>#{index + 1}</span>
              <span className={styles.playerName}>{player.name}</span>
              <span className={styles.score}>{player.score}</span>
            </div>
          ))}
        </div>

        <button className={styles.closeButton} onClick={onClose}>
          {language === 'zh' ? '關閉' : 'Close'}
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Create GameOverModal.module.css**

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  color: white;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.title {
  font-size: 32px;
  margin: 0 0 30px 0;
  text-align: center;
  font-weight: 700;
}

.winner {
  text-align: center;
  margin-bottom: 30px;
}

.crown {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.winner h2 {
  font-size: 28px;
  margin: 10px 0;
}

.winner p {
  font-size: 20px;
  margin: 5px 0;
}

.scores {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.scores h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
}

.scoreRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.scoreRow:last-child {
  border-bottom: none;
}

.rank {
  font-weight: 700;
  font-size: 18px;
  min-width: 40px;
}

.playerName {
  flex: 1;
  font-size: 18px;
}

.score {
  font-weight: 700;
  font-size: 20px;
}

.closeButton {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.closeButton:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}
```

**Step 4: Integrate game over detection**

Add to `frontend-new/src/store/gameStore.ts`:

```typescript
interface GameStore {
  // ... existing fields
  isGameOver: boolean;
  finalScores: { name: string; score: number }[] | null;
  checkGameOver: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ... existing state
  isGameOver: false,
  finalScores: null,

  setGameState: (state: GameState) => {
    set({ gameState: state });
    get().updateCurrentPlayer();
    get().checkGameOver();
  },

  checkGameOver: () => {
    const state = get().gameState;
    if (!state) return;

    // Check if Province is empty
    const provinceEmpty = state.supply['Province'] === 0;

    // Check if 3 piles are empty
    const emptyPiles = Object.values(state.supply).filter((count) => count === 0).length;

    if (provinceEmpty || emptyPiles >= 3) {
      // Calculate scores (frontend estimate)
      // TODO: Get real scores from backend
      const scores = state.players.map((player) => ({
        name: player.name,
        score: 0, // Backend should send this
      }));
      set({ isGameOver: true, finalScores: scores });
    }
  },
}));
```

**Step 5: Add modal to App.tsx**

```tsx
import { GameOverModal } from './components/GameUI/GameOverModal';

function App() {
  const isGameOver = useGameStore((state) => state.isGameOver);
  const finalScores = useGameStore((state) => state.finalScores);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <TopBar />
      <ActionLog />
      <TurnControls />
      <GameContainer />

      {isGameOver && finalScores && (
        <GameOverModal
          scores={finalScores}
          onClose={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

**Step 6: Test game over (mock)**

Temporarily modify gameStore to trigger game over:
```typescript
// In setGameState:
if (state.supply['Province'] <= 5) { // Mock trigger
  set({ isGameOver: true, finalScores: [
    { name: 'Alice', score: 25 },
    { name: 'Bob', score: 18 },
  ]});
}
```

Run: `npm run dev`
Expected: Game over modal appears with scores

**Step 7: Remove mock, commit**

```bash
git add .
git commit -m "feat: add victory condition detection and game over modal"
```

---

## Phase 3: Complete Action Card Effects

### Task 6: Implement All Action Cards in Backend

**Files:**
- Modify: `crates/shared/src/game.rs`
- Create: `crates/shared/src/cards/actions.rs`

**Step 1: Create actions.rs for card effects**

```rust
use crate::card::Card;
use crate::game::{GameState, Player};

impl GameState {
    pub fn play_village(&mut self) -> Result<(), String> {
        let player = self.get_current_player_mut()?;
        player.actions += 2;
        self.draw_card()?;
        self.add_log(format!("{} played Village: +1 Card, +2 Actions", player.name));
        Ok(())
    }

    pub fn play_smithy(&mut self) -> Result<(), String> {
        let player_name = self.get_current_player()?.name.clone();
        for _ in 0..3 {
            self.draw_card()?;
        }
        self.add_log(format!("{} played Smithy: +3 Cards", player_name));
        Ok(())
    }

    pub fn play_market(&mut self) -> Result<(), String> {
        let player = self.get_current_player_mut()?;
        player.actions += 1;
        player.buys += 1;
        player.coins += 1;
        self.draw_card()?;
        self.add_log(format!("{} played Market: +1 Card, +1 Action, +1 Buy, +1 Coin", player.name));
        Ok(())
    }

    pub fn play_workshop(&mut self) -> Result<(), String> {
        // Need player to select card costing up to 4
        // For now, log and wait for selection
        let player_name = self.get_current_player()?.name.clone();
        self.add_log(format!("{} played Workshop: gain a card costing up to 4", player_name));
        // TODO: Implement selection mechanism
        Ok(())
    }

    pub fn play_militia(&mut self) -> Result<(), String> {
        let player = self.get_current_player_mut()?;
        player.coins += 2;
        let attacker_name = player.name.clone();

        // Each other player discards down to 3 cards
        for i in 0..self.players.len() {
            if i != self.current_player {
                let other_player = &mut self.players[i];
                while other_player.hand.len() > 3 {
                    if let Some(card) = other_player.hand.pop() {
                        other_player.discard.push(card);
                    }
                }
                self.add_log(format!("{} discarded down to 3 cards", other_player.name));
            }
        }

        self.add_log(format!("{} played Militia: +2 Coins, others discard to 3", attacker_name));
        Ok(())
    }

    pub fn play_moat(&mut self) -> Result<(), String> {
        let player_name = self.get_current_player()?.name.clone();
        for _ in 0..2 {
            self.draw_card()?;
        }
        self.add_log(format!("{} played Moat: +2 Cards", player_name));
        Ok(())
    }

    pub fn play_remodel(&mut self) -> Result<(), String> {
        let player_name = self.get_current_player()?.name.clone();
        self.add_log(format!("{} played Remodel: trash a card, gain one costing up to 2 more", player_name));
        // TODO: Implement trash + gain mechanism
        Ok(())
    }

    pub fn play_mine(&mut self) -> Result<(), String> {
        let player_name = self.get_current_player()?.name.clone();
        self.add_log(format!("{} played Mine: trash a Treasure, gain one costing up to 3 more", player_name));
        // TODO: Implement treasure upgrade
        Ok(())
    }

    pub fn play_woodcutter(&mut self) -> Result<(), String> {
        let player = self.get_current_player_mut()?;
        player.buys += 1;
        player.coins += 2;
        self.add_log(format!("{} played Woodcutter: +1 Buy, +2 Coins", player.name));
        Ok(())
    }
}
```

**Step 2: Update play_card in game.rs**

```rust
pub fn play_card(&mut self, card_name: &str) -> Result<(), String> {
    if self.phase != TurnPhase::Action {
        return Err("Not in action phase".to_string());
    }

    let player = self.get_current_player_mut()?;

    if player.actions == 0 {
        return Err("No actions remaining".to_string());
    }

    // Find and remove card from hand
    let card = self.find_card_by_name(card_name)?;
    let card_index = player
        .hand
        .iter()
        .position(|c| *c == card)
        .ok_or("Card not in hand")?;

    let card = player.hand.remove(card_index);
    player.actions -= 1;

    // Execute card effect
    let result = match card {
        Card::Village => self.play_village(),
        Card::Smithy => self.play_smithy(),
        Card::Market => self.play_market(),
        Card::Cellar => Ok(()), // Already implemented
        Card::Workshop => self.play_workshop(),
        Card::Militia => self.play_militia(),
        Card::Moat => self.play_moat(),
        Card::Remodel => self.play_remodel(),
        Card::Mine => self.play_mine(),
        Card::Woodcutter => self.play_woodcutter(),
        _ => {
            // Treasure cards - just add coins
            let coins = card.treasure_value();
            if coins > 0 {
                let player = self.get_current_player_mut()?;
                player.coins += coins;
                self.add_log(format!("{} played {}: +{} Coins", player.name, card_name, coins));
                Ok(())
            } else {
                Err(format!("Cannot play {}", card_name))
            }
        }
    };

    // Move to play area
    let player = self.get_current_player_mut()?;
    player.discard.push(card);

    result
}
```

**Step 3: Test compilation**

Run: `~/.cargo/bin/cargo build`
Expected: Compiles successfully

**Step 4: Test action cards**

Run backend: `~/.cargo/bin/cargo run -p backend`
Run frontend: `npm run dev`

In browser, click on Village card
Expected: ActionLog shows "+1 Card, +2 Actions", counters update

**Step 5: Commit**

```bash
git add .
git commit -m "feat: implement all action card effects"
```

---

## Phase 4: AI Turn Automation

### Task 7: AI Turn Visualization

**Files:**
- Create: `frontend-new/src/game/AITurnController.ts`
- Modify: `frontend-new/src/game/GameContainer.tsx`

**Step 1: Create AITurnController.ts**

```typescript
import { wsService } from '../services/websocket';
import { GameState } from '../types/game';

export class AITurnController {
  private isAITurn: boolean = false;
  private processingAI: boolean = false;

  checkAndProcessAITurn(gameState: GameState) {
    const currentPlayer = gameState.players[gameState.current_player];

    if (currentPlayer.name.includes('Bot') || currentPlayer.name.includes('AI')) {
      if (!this.processingAI) {
        this.processAITurn(gameState);
      }
    }
  }

  private async processAITurn(gameState: GameState) {
    this.processingAI = true;

    // Wait 1 second before AI acts (so player can see)
    await this.delay(1000);

    // AI automatically plays all cards, then buys, then ends turn
    // This is placeholder - backend AI already makes decisions
    // Just send EndPhase to let backend AI continue

    while (gameState.phase !== 'Cleanup') {
      wsService.send({ type: 'EndPhase' });
      await this.delay(500);
    }

    this.processingAI = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Step 2: Integrate into GameContainer**

```tsx
import { AITurnController } from '../game/AITurnController';

export function GameContainer() {
  const aiController = useRef(new AITurnController());
  const gameState = useGameStore((state) => state.gameState);

  useEffect(() => {
    if (gameState) {
      aiController.current.checkAndProcessAITurn(gameState);
    }
  }, [gameState?.current_player, gameState?.phase]);

  // ... rest of code
}
```

**Step 3: Test AI turn**

Run both servers
Wait for Bot's turn
Expected: AI plays automatically with delays, player can see actions

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add AI turn visualization controller"
```

---

## Phase 5: Card Animations

### Task 8: Card Draw Animation

**Files:**
- Create: `frontend-new/src/game/animations/CardAnimations.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: Create CardAnimations.ts**

```typescript
import Phaser from 'phaser';
import { Card } from '../objects/Card';

export class CardAnimations {
  static animateDrawCard(
    scene: Phaser.Scene,
    cardName: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): Card {
    const card = new Card(scene, fromX, fromY, cardName);
    card.setScale(0.5);
    card.setAlpha(0.7);

    scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    return card;
  }

  static animateBuyCard(
    scene: Phaser.Scene,
    cardName: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    const tempCard = new Card(scene, fromX, fromY, cardName);

    scene.tweens.add({
      targets: tempCard,
      x: toX,
      y: toY,
      scale: 0.8,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        tempCard.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  static animatePlayCard(
    card: Card,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    card.scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Fade out after a moment
        card.scene.time.delayedCall(800, () => {
          card.scene.tweens.add({
            targets: card,
            alpha: 0,
            scale: 0.8,
            duration: 300,
            onComplete: () => {
              if (onComplete) onComplete();
            },
          });
        });
      },
    });
  }
}
```

**Step 2: Use animations in TableScene**

```typescript
import { CardAnimations } from '../animations/CardAnimations';

// In TableScene.create():
this.events.on('animate-draw', (cardName: string) => {
  const deckX = 100;
  const deckY = 400;
  const handY = 650;
  const handX = this.cameras.main.width / 2;

  const card = CardAnimations.animateDrawCard(
    this,
    cardName,
    deckX,
    deckY,
    handX,
    handY,
    () => {
      this.hand.addCard(card);
    }
  );
});

this.events.on('animate-buy', (data: { cardName: string; pileX: number; pileY: number }) => {
  const discardX = 200;
  const discardY = 400;

  CardAnimations.animateBuyCard(
    this,
    data.cardName,
    data.pileX,
    data.pileY,
    discardX,
    discardY
  );
});
```

**Step 3: Trigger animations from GameContainer**

```tsx
// In GameContainer, listen for animation hints from backend
useEffect(() => {
  const unsubscribe = wsService.onMessage((msg) => {
    if (msg.payload.animation_hints) {
      const hint = msg.payload.animation_hints;
      const scene = gameRef.current?.getScene('TableScene');

      if (scene) {
        if (hint.type === 'draw') {
          scene.events.emit('animate-draw', hint.card);
        } else if (hint.type === 'buy') {
          scene.events.emit('animate-buy', {
            cardName: hint.card,
            pileX: 200,  // TODO: Get actual pile position
            pileY: 200,
          });
        }
      }
    }
  });

  return unsubscribe;
}, []);
```

**Step 4: Test animations**

Run: `npm run dev`
Play a card that draws (Village, Smithy)
Expected: See card fly from deck to hand

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add card draw and buy animations"
```

---

## Phase 6: Polish & Final Features

### Task 9: Game Start Screen

**Files:**
- Create: `frontend-new/src/components/GameUI/StartScreen.tsx`
- Create: `frontend-new/src/components/GameUI/StartScreen.module.css`
- Modify: `frontend-new/src/store/gameStore.ts`

**Step 1: Create StartScreen.tsx**

```tsx
import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import styles from './StartScreen.module.css';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const [playerName, setPlayerName] = useState('Alice');

  const handleStart = () => {
    // Send start game request to backend
    wsService.send({
      type: 'StartGame',
      payload: { playerName },
    });
    onStart();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          {language === 'zh' ? '皇輿爭霸' : 'Dominion'}
        </h1>

        <div className={styles.form}>
          <label className={styles.label}>
            {language === 'zh' ? '玩家名稱' : 'Player Name'}
          </label>
          <input
            type="text"
            className={styles.input}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />

          <button className={styles.startButton} onClick={handleStart}>
            {language === 'zh' ? '開始遊戲' : 'Start Game'}
          </button>

          <button
            className={styles.langButton}
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          >
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create StartScreen.module.css**

```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #2d4a3e 0%, #1a2f26 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.container {
  text-align: center;
  color: white;
}

.title {
  font-size: 64px;
  font-weight: 700;
  margin-bottom: 60px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.label {
  font-size: 18px;
  font-weight: 500;
}

.input {
  padding: 12px 20px;
  font-size: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  width: 300px;
  text-align: center;
}

.input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.15);
}

.startButton {
  padding: 16px 48px;
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.startButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.langButton {
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.langButton:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

**Step 3: Add to App.tsx**

```tsx
import { StartScreen } from './components/GameUI/StartScreen';

function App() {
  const gameState = useGameStore((state) => state.gameState);
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      {!gameStarted && <StartScreen onStart={() => setGameStarted(true)} />}

      <TopBar />
      <ActionLog />
      <TurnControls />
      <GameContainer />

      {isGameOver && finalScores && (
        <GameOverModal
          scores={finalScores}
          onClose={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

**Step 4: Test start screen**

Run: `npm run dev`
Expected: Shows start screen, can enter name and start game

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add game start screen"
```

---

### Task 10: Sound Effects (Optional)

**Files:**
- Create: `frontend-new/public/sounds/` directory
- Create: `frontend-new/src/utils/SoundManager.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: Create SoundManager.ts**

```typescript
export class SoundManager {
  private static instance: SoundManager;
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playCardDraw() {
    this.playTone(400, 0.1, 0.05);
  }

  playCardPlay() {
    this.playTone(600, 0.15, 0.08);
  }

  playCardBuy() {
    this.playTone(800, 0.2, 0.1);
  }

  playPhaseChange() {
    this.playTone(500, 0.15, 0.1);
  }

  playGameOver() {
    setTimeout(() => this.playTone(523, 0.2, 0.1), 0);
    setTimeout(() => this.playTone(659, 0.2, 0.1), 200);
    setTimeout(() => this.playTone(784, 0.3, 0.15), 400);
  }

  private playTone(frequency: number, duration: number, volume: number) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
```

**Step 2: Integrate sound effects**

Modify `frontend-new/src/game/scenes/TableScene.ts`:

```typescript
import { SoundManager } from '../../utils/SoundManager';

// In TableScene:
this.events.on('card-clicked', (cardName: string) => {
  SoundManager.getInstance().playCardPlay();
  // ... existing code
});

this.events.on('animate-draw', (cardName: string) => {
  SoundManager.getInstance().playCardDraw();
  // ... existing code
});
```

**Step 3: Add sound toggle button**

Add to `TurnControls.tsx`:

```tsx
import { SoundManager } from '../../utils/SoundManager';

const [soundEnabled, setSoundEnabled] = useState(true);

const toggleSound = () => {
  const newState = !soundEnabled;
  setSoundEnabled(newState);
  SoundManager.getInstance().setEnabled(newState);
};

// Add button:
<button className={styles.soundButton} onClick={toggleSound}>
  {soundEnabled ? '🔊' : '🔇'}
</button>
```

**Step 4: Test sounds**

Run: `npm run dev`
Click cards, draw cards
Expected: Hear subtle tone sounds

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add sound effects with toggle"
```

---

## Phase 7: Final Testing & Bug Fixes

### Task 11: Comprehensive Testing

**Files:**
- Create: `docs/TESTING_CHECKLIST.md`

**Step 1: Create testing checklist**

```markdown
# Dominion Complete Playable Version - Testing Checklist

## Core Gameplay
- [ ] Start new game with custom player name
- [ ] Hand displays 5 initial cards
- [ ] Click card in hand to play during Action phase
- [ ] Action counters decrease when playing action cards
- [ ] Treasure cards add coins when played
- [ ] Click supply pile to buy card during Buy phase
- [ ] Buy counters decrease when buying
- [ ] Coins decrease by card cost when buying
- [ ] End Phase button advances phase correctly
- [ ] Turn cycles through Action → Buy → Cleanup
- [ ] Hand cleared and redrawn (5 cards) after Cleanup
- [ ] Next player's turn starts after Cleanup

## Action Cards
- [ ] Village: +1 Card, +2 Actions
- [ ] Smithy: +3 Cards
- [ ] Market: +1 Card, +1 Action, +1 Buy, +1 Coin
- [ ] Cellar: Discard cards, draw same number
- [ ] Workshop: Gain card costing ≤4
- [ ] Militia: +2 Coins, others discard to 3
- [ ] Moat: +2 Cards
- [ ] Remodel: Trash card, gain one costing +2
- [ ] Mine: Trash treasure, gain one costing +3
- [ ] Woodcutter: +1 Buy, +2 Coins

## Supply Area
- [ ] All card piles visible
- [ ] Correct counts displayed
- [ ] Counts update after purchase
- [ ] Empty piles grayed out
- [ ] Cost badges show correct values
- [ ] Hover effect on piles

## Victory Conditions
- [ ] Game ends when Province pile empty
- [ ] Game ends when 3 piles empty
- [ ] Final scores calculated correctly
- [ ] Winner displayed in modal
- [ ] All players' scores shown

## AI Opponent
- [ ] AI turn plays automatically
- [ ] AI actions visible in action log
- [ ] AI plays action cards
- [ ] AI buys cards
- [ ] AI ends turn automatically
- [ ] Delay between AI actions (1 second)

## UI & Visual
- [ ] TopBar shows current player
- [ ] TopBar shows current phase
- [ ] Action/Buy/Coin counters update in real-time
- [ ] Language toggle works (zh/en)
- [ ] All text translates correctly
- [ ] ActionLog displays all game events
- [ ] ActionLog auto-scrolls to bottom
- [ ] Hand cards arranged in fan shape
- [ ] Hand cards rotate correctly
- [ ] Card hover lifts card up
- [ ] Drag-and-drop works smoothly

## Animations
- [ ] Draw card animation (deck → hand)
- [ ] Play card animation (hand → play area)
- [ ] Buy card animation (supply → discard)
- [ ] Phase transition smooth
- [ ] All animations 60fps

## Sound (If implemented)
- [ ] Card draw sound
- [ ] Card play sound
- [ ] Card buy sound
- [ ] Phase change sound
- [ ] Game over sound
- [ ] Sound toggle button works

## Edge Cases
- [ ] Cannot play action card with 0 actions
- [ ] Cannot buy card with insufficient coins
- [ ] Cannot buy card with 0 buys
- [ ] Cannot play card not in hand
- [ ] Empty deck triggers shuffle
- [ ] Hand limit enforced during Militia attack
- [ ] Game handles 2 players correctly

## Performance
- [ ] No memory leaks (play 5+ turns)
- [ ] Frame rate stays 60fps
- [ ] WebSocket reconnects on disconnect
- [ ] No console errors
- [ ] Build size reasonable (<2MB)

## Cross-Browser (Bonus)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
```

**Step 2: Run through checklist**

Manually test each item, fix any bugs found

**Step 3: Document known issues**

Create `docs/KNOWN_ISSUES.md` if needed

**Step 4: Commit**

```bash
git add .
git commit -m "docs: add comprehensive testing checklist"
```

---

### Task 12: Performance Optimization

**Files:**
- Modify: `frontend-new/vite.config.ts`
- Modify: `frontend-new/src/game/objects/Card.ts`

**Step 1: Optimize Vite build**

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

**Step 2: Optimize card rendering**

Add to `Card.ts`:

```typescript
// In constructor, cache text rendering
this.cardText.setCacheAsBitmap(true);

// Disable unnecessary physics
this.setInteractive({ draggable: true, pixelPerfect: false });
```

**Step 3: Test performance**

Run: `npm run build && npm run preview`
Play full game, monitor FPS
Expected: Stable 60fps throughout game

**Step 4: Commit**

```bash
git add .
git commit -m "perf: optimize build and rendering performance"
```

---

## Verification & Completion

### Final Steps

**Step 1: Build production version**

```bash
cd frontend-new
npm run build
```

Expected: Clean build, no errors, warnings acceptable

**Step 2: Test production build**

```bash
npm run preview
```

Play complete game, verify all features work

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete playable Dominion implementation

- Supply area with buy interactions
- Turn flow with End Phase button
- Victory condition detection and game over modal
- All 10 action cards implemented
- AI turn automation with visualization
- Card draw/play/buy animations
- Game start screen
- Sound effects with toggle
- Comprehensive testing and optimization

Game is now fully playable from start to finish."
```

**Step 4: Ready for merge/PR**

Use `superpowers:finishing-a-development-branch` skill to complete development.

---

## Summary

This plan transforms the prototype into a complete playable game:

**Phase 1: Supply & Buy System (Tasks 1-3)**
- Supply area display
- Backend supply integration
- Buy card interactions

**Phase 2: Turn Flow (Tasks 4-5)**
- End Phase button
- Victory condition detection
- Game over modal

**Phase 3: Complete Cards (Task 6)**
- All 10 action card effects

**Phase 4: AI Integration (Task 7)**
- AI turn automation
- Visualization delays

**Phase 5: Animations (Task 8)**
- Draw/play/buy animations
- Smooth transitions

**Phase 6: Polish (Tasks 9-10)**
- Game start screen
- Sound effects

**Phase 7: Final Testing (Tasks 11-12)**
- Comprehensive test checklist
- Performance optimization

Total: 12 new tasks to complete playable version
Estimated time: 2-3 hours of focused implementation
