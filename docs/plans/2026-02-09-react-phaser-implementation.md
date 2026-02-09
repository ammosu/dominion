# React + Phaser 3 遷移實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目標：** 將 Dominion 卡牌遊戲從 Vanilla JS 全面重構為 React + Phaser 3，打造擬真桌遊風格的現代化遊戲體驗。

**架構：** 前端使用 React 18 + TypeScript + Phaser 3 + Vite，後端升級 Rust + Axum 支援 WebSocket，保留現有遊戲邏輯和 AI。

**技術堆疊：** React 18, TypeScript, Phaser 3, Vite, Zustand, Socket.IO, Rust, Axum, tokio-tungstenite

---

## Phase 1: 基礎架構設置

### Task 1: Vite + React + TypeScript 專案初始化

**Files:**
- Create: `frontend-new/package.json`
- Create: `frontend-new/vite.config.ts`
- Create: `frontend-new/tsconfig.json`
- Create: `frontend-new/index.html`
- Create: `frontend-new/src/main.tsx`
- Create: `frontend-new/src/App.tsx`

**Step 1: 初始化 npm 專案**

Run: `cd frontend-new && npm init -y`
Expected: Creates `package.json`

**Step 2: 安裝核心依賴**

```bash
npm install react@18 react-dom@18
npm install -D vite@5 @vitejs/plugin-react typescript @types/react @types/react-dom
```

Expected: Dependencies installed

**Step 3: 建立 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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

**Step 4: 建立 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 5: 建立 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 6: 建立 index.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dominion - 皇輿爭霸</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 7: 建立 src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 8: 建立 src/App.tsx**

```tsx
function App() {
  return (
    <div>
      <h1>Dominion - React + Phaser 3</h1>
      <p>架構測試成功</p>
    </div>
  );
}

export default App;
```

**Step 9: 測試開發伺服器**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173, shows "架構測試成功"

**Step 10: Commit**

```bash
git add frontend-new/
git commit -m "feat: initialize Vite + React + TypeScript project"
```

---

### Task 2: Phaser 3 整合與基本場景

**Files:**
- Create: `frontend-new/src/game/PhaserGame.ts`
- Create: `frontend-new/src/game/GameContainer.tsx`
- Create: `frontend-new/src/game/scenes/Preloader.ts`
- Create: `frontend-new/src/game/scenes/TableScene.ts`
- Create: `frontend-new/src/game/config/gameConfig.ts`
- Modify: `frontend-new/src/App.tsx`

**Step 1: 安裝 Phaser 3**

```bash
cd frontend-new
npm install phaser@3
```

Expected: Phaser installed

**Step 2: 建立 gameConfig.ts**

```typescript
import Phaser from 'phaser';
import { Preloader } from '../scenes/Preloader';
import { TableScene } from '../scenes/TableScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 800,
  backgroundColor: '#2d4a3e',
  parent: 'phaser-container',
  scene: [Preloader, TableScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};
```

**Step 3: 建立 Preloader.ts**

```typescript
import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // 顯示載入進度
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // TODO: 之後載入卡片資源
  }

  create() {
    this.scene.start('TableScene');
  }
}
```

**Step 4: 建立 TableScene.ts**

```typescript
import Phaser from 'phaser';

export class TableScene extends Phaser.Scene {
  constructor() {
    super('TableScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 顯示桌面背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

    // 測試文字
    this.add.text(width / 2, height / 2, 'Phaser Table Scene', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
```

**Step 5: 建立 PhaserGame.ts**

```typescript
import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

export class PhaserGame {
  private game: Phaser.Game | null = null;

  constructor(containerId: string) {
    const config = {
      ...gameConfig,
      parent: containerId,
    };
    this.game = new Phaser.Game(config);
  }

  destroy() {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  getScene<T extends Phaser.Scene>(key: string): T | null {
    return this.game?.scene.getScene(key) as T | null;
  }
}
```

**Step 6: 建立 GameContainer.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new PhaserGame('phaser-container');
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  return <div id="phaser-container" ref={containerRef} />;
}
```

**Step 7: 更新 App.tsx**

```tsx
import { GameContainer } from './game/GameContainer';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <GameContainer />
    </div>
  );
}

export default App;
```

**Step 8: 測試 Phaser 整合**

Run: `npm run dev`
Expected: Opens browser, shows green table with "Phaser Table Scene" text

**Step 9: Commit**

```bash
git add .
git commit -m "feat: integrate Phaser 3 with React"
```

---

### Task 3: Rust 後端 WebSocket 升級

**Files:**
- Modify: `crates/backend/Cargo.toml`
- Create: `crates/backend/src/websocket.rs`
- Create: `crates/backend/src/events.rs`
- Modify: `crates/backend/src/main.rs`

**Step 1: 新增 WebSocket 依賴**

Edit `crates/backend/Cargo.toml`, add to `[dependencies]`:

```toml
tokio-tungstenite = "0.21"
futures-util = "0.3"
```

**Step 2: 建立 events.rs**

```rust
use serde::{Deserialize, Serialize};
use shared::game::GameState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    PlayCard { card: String },
    BuyCard { card: String },
    EndPhase,
    PlayCellar { cards: Vec<String> },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimationHint {
    #[serde(rename = "type")]
    pub hint_type: String,
    pub from: String,
    pub to: String,
    pub card: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub payload: ServerPayload,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerPayload {
    pub game_state: GameState,
    pub animation_hints: Option<AnimationHint>,
}
```

**Step 3: 建立 websocket.rs**

```rust
use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::events::{ClientMessage, ServerMessage};
use crate::Games;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(games): State<Games>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, games))
}

async fn handle_socket(socket: WebSocket, games: Games) {
    let (mut sender, mut receiver) = socket.split();

    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            // Parse client message
            if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                println!("Received: {:?}", client_msg);

                // TODO: Process game action
                // For now, just echo back
                let response = serde_json::json!({
                    "type": "GameStateUpdate",
                    "payload": {
                        "message": "Received"
                    }
                });

                if let Ok(response_text) = serde_json::to_string(&response) {
                    let _ = sender.send(Message::Text(response_text)).await;
                }
            }
        }
    }
}
```

**Step 4: 更新 main.rs**

Add to imports:
```rust
use axum::extract::WebSocketUpgrade;
mod websocket;
mod events;
```

Add to router (after other routes):
```rust
.route("/ws", get(websocket::websocket_handler))
```

**Step 5: 測試編譯**

Run: `~/.cargo/bin/cargo build`
Expected: Compiles without errors

**Step 6: 測試 WebSocket 端點**

Run: `~/.cargo/bin/cargo run -p backend`
Expected: Server starts on port 3000

**Step 7: Commit**

```bash
git add crates/backend/
git commit -m "feat: add WebSocket support to Rust backend"
```

---

### Task 4: 前端 WebSocket 客戶端

**Files:**
- Create: `frontend-new/src/services/websocket.ts`
- Create: `frontend-new/src/types/websocket.ts`
- Create: `frontend-new/src/types/game.ts`

**Step 1: 建立 websocket.ts 型別**

```typescript
export interface ClientMessage {
  type: 'PlayCard' | 'BuyCard' | 'EndPhase' | 'PlayCellar';
  payload?: Record<string, unknown>;
}

export interface AnimationHint {
  type: string;
  from: string;
  to: string;
  card: string;
}

export interface ServerMessage {
  type: string;
  payload: {
    game_state?: unknown;
    animation_hints?: AnimationHint;
  };
}
```

**Step 2: 建立 game.ts 型別（基本）**

```typescript
export interface GameState {
  current_player: number;
  phase: 'Action' | 'Buy' | 'Cleanup';
  players: Player[];
  supply: Record<string, number>;
  log: string[];
}

export interface Player {
  name: string;
  hand: string[];
  deck_size: number;
  discard_size: number;
  actions: number;
  buys: number;
  coins: number;
}
```

**Step 3: 建立 websocket.ts 服務**

```typescript
import { ClientMessage, ServerMessage } from '../types/websocket';

type MessageHandler = (message: ServerMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(url: string = 'ws://localhost:3000/ws') {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(url);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect(url: string) {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.connect(url);
      }, 3000);
    }
  }

  send(message: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
```

**Step 4: 測試 WebSocket 連接**

Edit `App.tsx`:
```tsx
import { useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { wsService } from './services/websocket';

function App() {
  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onMessage((msg) => {
      console.log('Received message:', msg);
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <GameContainer />
    </div>
  );
}

export default App;
```

**Step 5: 測試端到端連接**

Run backend: `~/.cargo/bin/cargo run -p backend`
Run frontend: `cd frontend-new && npm run dev`
Expected: Browser console shows "WebSocket connected"

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add WebSocket client service"
```

---

## Phase 2: 核心遊戲物件

### Task 5: Card 類別實作（基本版本）

**Files:**
- Create: `frontend-new/src/game/objects/Card.ts`
- Create: `frontend-new/src/utils/cardData.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: 建立 cardData.ts**

```typescript
export interface CardData {
  name: { en: string; zh: string };
  type: 'treasure' | 'victory' | 'action' | 'curse';
  cost: number;
  desc?: { en: string; zh: string };
  tooltip?: { en: string; zh: string };
  coins?: number;
  vp?: number;
}

export const CARD_DATA: Record<string, CardData> = {
  Copper: {
    name: { en: 'Copper', zh: '銅幣' },
    type: 'treasure',
    cost: 0,
    coins: 1,
    tooltip: { en: 'Worth 1 coin', zh: '價值 1 金幣' },
  },
  Silver: {
    name: { en: 'Silver', zh: '銀幣' },
    type: 'treasure',
    cost: 3,
    coins: 2,
    tooltip: { en: 'Worth 2 coins', zh: '價值 2 金幣' },
  },
  Gold: {
    name: { en: 'Gold', zh: '金幣' },
    type: 'treasure',
    cost: 6,
    coins: 3,
    tooltip: { en: 'Worth 3 coins', zh: '價值 3 金幣' },
  },
  Estate: {
    name: { en: 'Estate', zh: '莊園' },
    type: 'victory',
    cost: 2,
    vp: 1,
    tooltip: { en: 'Worth 1 victory point', zh: '價值 1 分' },
  },
  Duchy: {
    name: { en: 'Duchy', zh: '公國' },
    type: 'victory',
    cost: 5,
    vp: 3,
    tooltip: { en: 'Worth 3 victory points', zh: '價值 3 分' },
  },
  Province: {
    name: { en: 'Province', zh: '行省' },
    type: 'victory',
    cost: 8,
    vp: 6,
    tooltip: { en: 'Worth 6 victory points', zh: '價值 6 分' },
  },
  Curse: {
    name: { en: 'Curse', zh: '詛咒' },
    type: 'curse',
    cost: 0,
    vp: -1,
    tooltip: { en: 'Worth -1 victory point', zh: '價值 -1 分' },
  },
  Cellar: {
    name: { en: 'Cellar', zh: '地窖' },
    type: 'action',
    cost: 2,
    desc: { en: '+1 Action', zh: '+1 行動' },
    tooltip: { en: 'Discard any number of cards, then draw that many.', zh: '棄掉任意數量的牌，然後抽取等量的牌。' },
  },
  Market: {
    name: { en: 'Market', zh: '市集' },
    type: 'action',
    cost: 5,
    desc: { en: '+1 Card, +1 Action, +1 Buy, +1 Coin', zh: '+1 張牌、+1 行動、+1 購買、+1 金幣' },
    tooltip: { en: 'Draw 1 card. +1 Action, +1 Buy, +1 Coin.', zh: '抽 1 張牌。+1 行動、+1 購買、+1 金幣。' },
  },
  Smithy: {
    name: { en: 'Smithy', zh: '鐵匠' },
    type: 'action',
    cost: 4,
    desc: { en: '+3 Cards', zh: '+3 張牌' },
    tooltip: { en: 'Draw 3 cards from your deck.', zh: '從你的牌庫抽 3 張牌。' },
  },
  Village: {
    name: { en: 'Village', zh: '村莊' },
    type: 'action',
    cost: 3,
    desc: { en: '+1 Card, +2 Actions', zh: '+1 張牌、+2 行動' },
    tooltip: { en: 'Draw 1 card. +2 Actions.', zh: '抽 1 張牌。+2 行動。' },
  },
  Workshop: {
    name: { en: 'Workshop', zh: '工坊' },
    type: 'action',
    cost: 3,
    desc: { en: 'Gain a card costing up to 4', zh: '獲得一張價值不超過 4 的牌' },
    tooltip: { en: 'Gain a card costing up to 4 coins.', zh: '獲得一張價值不超過 4 金幣的牌。' },
  },
};
```

**Step 2: 建立 Card.ts（基本版本，無拖放）**

```typescript
import Phaser from 'phaser';

export class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string) {
    super(scene, x, y);

    this.cardName = cardName;

    // 臨時：使用簡單矩形代表卡片
    this.cardBg = scene.add.rectangle(0, 0, 80, 120, 0xffffff);
    this.add(this.cardBg);

    // 卡片名稱
    this.cardText = scene.add.text(0, 0, cardName, {
      fontSize: '12px',
      color: '#000000',
      wordWrap: { width: 70 },
      align: 'center',
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    scene.add.existing(this);
  }

  getCardName(): string {
    return this.cardName;
  }
}
```

**Step 3: 測試 Card 顯示**

Edit `TableScene.ts`:
```typescript
import Phaser from 'phaser';
import { Card } from '../objects/Card';

export class TableScene extends Phaser.Scene {
  constructor() {
    super('TableScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 桌面背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

    // 測試：建立幾張卡片
    const testCards = ['Copper', 'Silver', 'Gold', 'Estate', 'Smithy'];
    testCards.forEach((cardName, i) => {
      new Card(this, 200 + i * 100, 400, cardName);
    });
  }
}
```

**Step 4: 測試顯示**

Run: `npm run dev`
Expected: Shows 5 white rectangles with card names

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add basic Card class"
```

---

### Task 6: Card 拖放系統

**Files:**
- Modify: `frontend-new/src/game/objects/Card.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: 為 Card 啟用互動**

Edit `Card.ts` constructor, add after `scene.add.existing(this)`:

```typescript
// 啟用拖放
this.setSize(80, 120);
this.setInteractive({ draggable: true });
this.setupDragHandlers();
```

**Step 2: 新增拖放處理方法**

Add to `Card.ts`:

```typescript
private originalX: number = 0;
private originalY: number = 0;

private setupDragHandlers() {
  this.on('dragstart', this.onDragStart, this);
  this.on('drag', this.onDrag, this);
  this.on('dragend', this.onDragEnd, this);
}

private onDragStart() {
  this.originalX = this.x;
  this.originalY = this.y;

  // 卡片浮起動畫
  this.scene.tweens.add({
    targets: this,
    y: this.y - 20,
    scale: 1.1,
    duration: 200,
    ease: 'Back.easeOut',
  });

  // 提升 z-index
  this.setDepth(100);
}

private onDrag(pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
  this.x = dragX;
  this.y = dragY;
}

private onDragEnd(pointer: Phaser.Input.Pointer, dropped: boolean) {
  if (!dropped) {
    // 返回原位
    this.returnToOriginalPosition();
  }
}

returnToOriginalPosition() {
  this.scene.tweens.add({
    targets: this,
    x: this.originalX,
    y: this.originalY,
    scale: 1,
    duration: 300,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      this.setDepth(10);
    },
  });
}
```

**Step 3: 在 TableScene 啟用拖放輸入**

Edit `TableScene.ts` create method, add before creating cards:

```typescript
// 啟用拖放
this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
  gameObject.emit('drag', pointer, dragX, dragY);
});

this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
  gameObject.emit('dragstart', pointer);
});

this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
  gameObject.emit('dragend', pointer, dropped);
});
```

**Step 4: 測試拖放**

Run: `npm run dev`
Expected: Cards can be dragged, lift up when dragging, return with animation when released

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add drag-and-drop to Card class"
```

---

### Task 7: Hand 手牌區物件

**Files:**
- Create: `frontend-new/src/game/objects/Hand.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: 建立 Hand.ts**

```typescript
import Phaser from 'phaser';
import { Card } from './Card';

export class Hand {
  private scene: Phaser.Scene;
  private cards: Card[] = [];
  private baseY: number = 650;
  private spacing: number = 100;
  private arcHeight: number = 30;
  private maxRotation: number = 15;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addCard(card: Card) {
    this.cards.push(card);
    this.arrangeCards();
  }

  removeCard(card: Card) {
    const index = this.cards.indexOf(card);
    if (index !== -1) {
      this.cards.splice(index, 1);
      this.arrangeCards();
    }
  }

  arrangeCards() {
    const count = this.cards.length;
    if (count === 0) return;

    this.cards.forEach((card, i) => {
      // 計算扇形排列
      const t = count > 1 ? i / (count - 1) : 0.5;
      const angle = (t - 0.5) * 2 * this.maxRotation;

      const x = this.scene.cameras.main.width / 2 + (i - count / 2 + 0.5) * this.spacing;
      const y = this.baseY + Math.abs(angle) * this.arcHeight / this.maxRotation;

      // 動畫移動到新位置
      this.scene.tweens.add({
        targets: card,
        x: x,
        y: y,
        rotation: Phaser.Math.DegToRad(angle),
        duration: 300,
        ease: 'Cubic.easeOut',
      });

      // 設定深度（中間的卡片在上面）
      card.setDepth(10 + Math.abs(i - count / 2));
    });
  }

  getCards(): Card[] {
    return this.cards;
  }

  clear() {
    this.cards.forEach((card) => card.destroy());
    this.cards = [];
  }
}
```

**Step 2: 測試 Hand 排列**

Edit `TableScene.ts`:
```typescript
import { Hand } from '../objects/Hand';

export class TableScene extends Phaser.Scene {
  private hand!: Hand;

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

    // 建立手牌區
    this.hand = new Hand(this);

    // 測試：建立 5 張手牌
    const testCards = ['Copper', 'Silver', 'Gold', 'Estate', 'Smithy'];
    testCards.forEach((cardName) => {
      const card = new Card(this, 0, 0, cardName);
      this.hand.addCard(card);
    });

    // 啟用拖放
    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      gameObject.emit('drag', pointer, dragX, dragY);
    });

    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      gameObject.emit('dragstart', pointer);
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
      gameObject.emit('dragend', pointer, dropped);
    });
  }
}
```

**Step 3: 測試扇形排列**

Run: `npm run dev`
Expected: Cards arranged in fan shape at bottom, can still be dragged

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Hand class with fan arrangement"
```

---

### Task 8: Zustand 狀態管理

**Files:**
- Create: `frontend-new/src/store/gameStore.ts`
- Create: `frontend-new/src/store/uiStore.ts`

**Step 1: 安裝 Zustand**

```bash
cd frontend-new
npm install zustand
```

**Step 2: 建立 gameStore.ts**

```typescript
import { create } from 'zustand';
import { GameState, Player } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  currentPlayer: Player | null;
  updateCurrentPlayer: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  currentPlayer: null,

  setGameState: (state: GameState) => {
    set({ gameState: state });
    get().updateCurrentPlayer();
  },

  updateCurrentPlayer: () => {
    const state = get().gameState;
    if (state && state.players[state.current_player]) {
      set({ currentPlayer: state.players[state.current_player] });
    } else {
      set({ currentPlayer: null });
    }
  },
}));
```

**Step 3: 建立 uiStore.ts**

```typescript
import { create } from 'zustand';

interface UIStore {
  showRulesModal: boolean;
  setShowRulesModal: (show: boolean) => void;

  showConfirmModal: boolean;
  confirmModalData: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  openConfirmModal: (data: UIStore['confirmModalData']) => void;
  closeConfirmModal: () => void;

  hoveredCard: string | null;
  setHoveredCard: (card: string | null) => void;

  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showRulesModal: false,
  setShowRulesModal: (show) => set({ showRulesModal: show }),

  showConfirmModal: false,
  confirmModalData: null,
  openConfirmModal: (data) => set({ showConfirmModal: true, confirmModalData: data }),
  closeConfirmModal: () => set({ showConfirmModal: false, confirmModalData: null }),

  hoveredCard: null,
  setHoveredCard: (card) => set({ hoveredCard: card }),

  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),
}));
```

**Step 4: 測試 Store**

Edit `App.tsx`:
```typescript
import { useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);

  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onMessage((msg) => {
      console.log('Received message:', msg);
      if (msg.type === 'GameStateUpdate' && msg.payload.game_state) {
        setGameState(msg.payload.game_state as any);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [setGameState]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <GameContainer />
    </div>
  );
}

export default App;
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Zustand state management"
```

---

## Phase 3: React UI 組件

### Task 9: TopBar 組件

**Files:**
- Create: `frontend-new/src/components/GameUI/TopBar.tsx`
- Create: `frontend-new/src/components/GameUI/TopBar.module.css`
- Modify: `frontend-new/src/App.tsx`

**Step 1: 建立 TopBar.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!gameState || !currentPlayer) {
    return (
      <div className={styles.topBar}>
        <span>等待遊戲開始...</span>
      </div>
    );
  }

  const phaseText = {
    Action: { zh: '行動階段', en: 'Action Phase' },
    Buy: { zh: '購買階段', en: 'Buy Phase' },
    Cleanup: { zh: '清理階段', en: 'Cleanup Phase' },
  };

  return (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>
          {language === 'zh' ? '當前玩家：' : 'Current Player: '}
          {currentPlayer.name}
        </span>
        <span className={styles.phaseBadge}>
          {phaseText[gameState.phase][language]}
        </span>
      </div>

      <div className={styles.counters}>
        <span className={styles.counter}>
          {language === 'zh' ? '行動' : 'Actions'}: {currentPlayer.actions}
        </span>
        <span className={styles.counter}>
          {language === 'zh' ? '購買' : 'Buys'}: {currentPlayer.buys}
        </span>
        <span className={styles.counter}>
          {language === 'zh' ? '金幣' : 'Coins'}: {currentPlayer.coins}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: 建立 TopBar.module.css**

```css
.topBar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.playerInfo {
  display: flex;
  gap: 20px;
  align-items: center;
}

.playerName {
  font-size: 18px;
  font-weight: 600;
}

.phaseBadge {
  background: #4CAF50;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.counters {
  display: flex;
  gap: 24px;
}

.counter {
  font-size: 16px;
  font-weight: 500;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
```

**Step 3: 整合到 App**

Edit `App.tsx`:
```tsx
import { useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { TopBar } from './components/GameUI/TopBar';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);

  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onMessage((msg) => {
      if (msg.type === 'GameStateUpdate' && msg.payload.game_state) {
        setGameState(msg.payload.game_state as any);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [setGameState]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <TopBar />
      <GameContainer />
    </div>
  );
}

export default App;
```

**Step 4: 測試顯示（需要模擬遊戲狀態）**

For testing, temporarily edit `App.tsx` to set mock state:
```tsx
useEffect(() => {
  // Mock game state for testing
  setGameState({
    current_player: 0,
    phase: 'Action',
    players: [
      { name: 'Alice', hand: [], deck_size: 5, discard_size: 0, actions: 1, buys: 1, coins: 0 },
      { name: 'Bob', hand: [], deck_size: 5, discard_size: 0, actions: 1, buys: 1, coins: 0 },
    ],
    supply: {},
    log: [],
  });

  wsService.connect();
  // ... rest of code
}, [setGameState]);
```

Run: `npm run dev`
Expected: Shows top bar with "當前玩家：Alice", "行動階段", counters

**Step 5: Remove mock data, commit**

```bash
git add .
git commit -m "feat: add TopBar UI component"
```

---

### Task 10: ActionLog 組件

**Files:**
- Create: `frontend-new/src/components/GameUI/ActionLog.tsx`
- Create: `frontend-new/src/components/GameUI/ActionLog.module.css`
- Modify: `frontend-new/src/App.tsx`

**Step 1: 建立 ActionLog.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './ActionLog.module.css';

export function ActionLog() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const logRef = useRef<HTMLDivElement>(null);

  // 自動滾動到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  if (!gameState) {
    return null;
  }

  return (
    <div className={styles.actionLog}>
      <div className={styles.header}>
        {language === 'zh' ? '遊戲記錄' : 'Action Log'}
      </div>
      <div className={styles.logContent} ref={logRef}>
        {gameState.log.length === 0 ? (
          <div className={styles.emptyLog}>
            {language === 'zh' ? '尚無記錄' : 'No actions yet'}
          </div>
        ) : (
          gameState.log.map((entry, index) => (
            <div key={index} className={styles.logEntry}>
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: 建立 ActionLog.module.css**

```css
.actionLog {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 300px;
  height: 400px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  font-weight: 600;
  color: white;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.logContent {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  color: white;
  font-size: 14px;
}

.logContent::-webkit-scrollbar {
  width: 8px;
}

.logContent::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.logContent::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.logContent::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.logEntry {
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  line-height: 1.4;
}

.logEntry:last-child {
  border-bottom: none;
}

.emptyLog {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 20px;
}
```

**Step 3: 整合到 App**

Edit `App.tsx`:
```tsx
import { ActionLog } from './components/GameUI/ActionLog';

function App() {
  // ... existing code

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <TopBar />
      <ActionLog />
      <GameContainer />
    </div>
  );
}
```

**Step 4: 測試（使用 mock 資料）**

Temporarily add to mock game state in `App.tsx`:
```tsx
log: ['Alice 打出 Village', 'Alice 抽 1 張牌', 'Alice 購買 Silver'],
```

Run: `npm run dev`
Expected: Shows action log panel on right side with 3 log entries

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add ActionLog UI component"
```

---

## Phase 4: 遊戲邏輯整合

### Task 11: 後端遊戲動作處理

**Files:**
- Modify: `crates/backend/src/websocket.rs`
- Modify: `crates/backend/src/main.rs`

**Step 1: 更新 websocket.rs 處理遊戲動作**

Replace `handle_socket` function:

```rust
async fn handle_socket(socket: WebSocket, games: Games) {
    let (mut sender, mut receiver) = socket.split();
    let game_id = uuid::Uuid::new_v4().to_string();

    // 建立測試遊戲
    let mut test_game = {
        let players = vec![
            shared::game::PlayerInfo {
                name: "Alice".to_string(),
                is_ai: false,
            },
            shared::game::PlayerInfo {
                name: "Bot".to_string(),
                is_ai: true,
            },
        ];
        shared::game::GameState::new(players)
    };

    // 送出初始遊戲狀態
    let init_msg = ServerMessage {
        msg_type: "GameStateUpdate".to_string(),
        payload: ServerPayload {
            game_state: test_game.clone(),
            animation_hints: None,
        },
    };
    if let Ok(text) = serde_json::to_string(&init_msg) {
        let _ = sender.send(Message::Text(text)).await;
    }

    // 處理訊息
    while let Some(Ok(msg)) = receiver.next().await {
        if let Message::Text(text) = msg {
            if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                println!("Received: {:?}", client_msg);

                // 處理動作
                let action_result = match client_msg {
                    ClientMessage::PlayCard { card } => {
                        test_game.play_card(&card)
                    }
                    ClientMessage::BuyCard { card } => {
                        test_game.buy_card(&card)
                    }
                    ClientMessage::EndPhase => {
                        test_game.advance_phase();
                        Ok(())
                    }
                    ClientMessage::PlayCellar { cards } => {
                        test_game.play_cellar(&cards)
                    }
                };

                // 送出更新後的狀態
                let response = ServerMessage {
                    msg_type: "GameStateUpdate".to_string(),
                    payload: ServerPayload {
                        game_state: test_game.clone(),
                        animation_hints: None, // TODO: 加入動畫提示
                    },
                };

                if let Ok(response_text) = serde_json::to_string(&response) {
                    let _ = sender.send(Message::Text(response_text)).await;
                }

                if let Err(e) = action_result {
                    eprintln!("Action error: {}", e);
                }
            }
        }
    }
}
```

**Step 2: 測試編譯**

Run: `~/.cargo/bin/cargo build`
Expected: Compiles without errors

**Step 3: 測試遊戲狀態同步**

Run backend: `~/.cargo/bin/cargo run -p backend`
Run frontend: `cd frontend-new && npm run dev`

Open browser console, run:
```javascript
wsService.send({ type: 'EndPhase' });
```

Expected: Console shows updated game state, TopBar updates phase

**Step 4: Commit**

```bash
git add .
git commit -m "feat: integrate game action processing in WebSocket"
```

---

### Task 12: 前端卡片點擊打出

**Files:**
- Modify: `frontend-new/src/game/objects/Card.ts`
- Modify: `frontend-new/src/game/scenes/TableScene.ts`

**Step 1: 為 Card 新增點擊事件**

Add to `Card.ts` constructor:

```typescript
// 點擊事件
this.on('pointerdown', this.onPointerDown, this);
this.on('pointerover', this.onPointerOver, this);
this.on('pointerout', this.onPointerOut, this);
```

**Step 2: 新增事件處理方法**

Add to `Card.ts`:

```typescript
private onPointerDown() {
  // 發送事件到 Scene
  this.scene.events.emit('card-clicked', this.cardName);
}

private onPointerOver() {
  // Hover 效果
  this.scene.tweens.add({
    targets: this,
    y: this.y - 10,
    duration: 150,
    ease: 'Cubic.easeOut',
  });

  // 通知 Scene
  this.scene.events.emit('card-hovered', this.cardName);
}

private onPointerOut() {
  // 取消 Hover
  this.scene.tweens.add({
    targets: this,
    y: this.y + 10,
    duration: 150,
    ease: 'Cubic.easeOut',
  });

  this.scene.events.emit('card-hovered', null);
}
```

**Step 3: TableScene 監聽卡片點擊**

Add to `TableScene.ts` create method:

```typescript
// 監聽卡片點擊
this.events.on('card-clicked', (cardName: string) => {
  console.log('Card clicked:', cardName);
  // 發送到外部（React）
  this.events.emit('play-card-request', cardName);
});

// 監聽卡片 Hover
this.events.on('card-hovered', (cardName: string | null) => {
  this.events.emit('card-hover-changed', cardName);
});
```

**Step 4: GameContainer 連接 WebSocket**

Edit `GameContainer.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new PhaserGame('phaser-container');

      // 監聽 Phaser 事件
      const scene = gameRef.current.getScene('TableScene');
      if (scene) {
        scene.events.on('play-card-request', (cardName: string) => {
          wsService.send({ type: 'PlayCard', payload: { card: cardName } });
        });

        scene.events.on('card-hover-changed', (cardName: string | null) => {
          setHoveredCard(cardName);
        });
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [setHoveredCard]);

  return <div id="phaser-container" ref={containerRef} />;
}
```

**Step 5: 測試卡片點擊**

Run: `npm run dev`
Click on a card
Expected: Console shows "Card clicked: [cardName]", WebSocket sends PlayCard message

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add card click interaction and WebSocket integration"
```

---

## 後續階段（簡要）

由於計劃已經非常詳細且長度較長，後續階段將以較高層次描述，實際執行時可根據需要細化。

### Phase 5: 供應區實作

**Task 13: SupplyArea 類別**
- 建立 `SupplyArea.ts`
- 顯示所有供應牌堆
- 點擊購買功能
- 剩餘數量顯示

**Task 14: 購買流程整合**
- 連接 SupplyArea 到 WebSocket
- 實作購買確認對話框
- 更新供應區數量

### Phase 6: 動畫系統

**Task 15: 卡片飛行動畫**
- 建立 `CardAnimations.ts`
- 實作卡片從牌庫到手牌的飛行
- 實作購買卡片到棄牌堆的飛行

**Task 16: 發牌和洗牌動畫**
- 發牌動畫（牌庫 → 手牌）
- 洗牌動畫（棄牌堆 → 牌庫）

### Phase 7: 視覺優化

**Task 17: 3D 透視調整**
- 設定相機角度
- 調整各區域深度和縮放
- 實作第一人稱視角

**Task 18: 材質和光影**
- 載入木質桌面材質
- 為卡片新增陰影
- 實作環境光效

### Phase 8: AI 整合測試

**Task 19: AI 回合自動執行**
- 監聽 AI 玩家回合
- 自動播放 AI 動作動畫
- 延遲處理（讓玩家看清 AI 動作）

**Task 20: 完整遊戲流程測試**
- 測試完整一局遊戲
- 修正所有 bug
- 效能優化

---

## 驗證與部署

### Task 21: 全面測試

**Step 1: 功能測試清單**
- [ ] 所有卡片可正常打出
- [ ] 購買流程完整
- [ ] AI 對戰正常運作
- [ ] 遊戲結束計分正確
- [ ] 雙語切換正常

**Step 2: 效能測試**
- [ ] 畫面維持 60 FPS
- [ ] WebSocket 延遲 < 100ms
- [ ] 記憶體無洩漏

**Step 3: 使用者體驗測試**
- [ ] 拖放手感自然
- [ ] 動畫流暢
- [ ] UI 直觀易用

### Task 22: 生產環境準備

**Step 1: 建置優化**

```bash
cd frontend-new
npm run build
```

**Step 2: 部署配置**
- 配置 Nginx 反向代理
- WebSocket 連接配置
- 靜態資源快取

**Step 3: 最終驗證**
- 生產環境完整測試
- 效能監控設置
- 錯誤追蹤配置

---

## 總結

這個計劃涵蓋了從基礎架構到完整遊戲的所有關鍵步驟：

1. **Phase 1-2**: 建立基礎（Vite + React + Phaser + WebSocket）
2. **Phase 3-4**: 核心功能（卡片、手牌、UI、遊戲邏輯）
3. **Phase 5-7**: 增強體驗（供應區、動畫、視覺效果）
4. **Phase 8**: 整合測試和優化

每個 Task 都設計為可獨立完成、測試和提交的單元，確保漸進式開發和快速迭代。
