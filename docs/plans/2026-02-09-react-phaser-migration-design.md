# React + Phaser 3 遷移設計文件

**日期：** 2026-02-09
**狀態：** 已批准

## 概述

將皇輿爭霸（Dominion）卡牌遊戲從 Vanilla JS 全面重構為 React + Phaser 3，打造擬真桌遊風格的現代化遊戲體驗。

## 設計決策總結

| 面向 | 決策 | 理由 |
|------|------|------|
| **遷移策略** | 全面重構 | 追求最佳的現代遊戲體驗 |
| **後端架構** | 保留 Rust + 升級 WebSocket | 保留穩定的遊戲邏輯和 AI，支援未來線上多人 |
| **視覺風格** | 擬真桌遊風格 | 3D 透視、真實材質、沉浸感最強 |
| **互動方式** | 完整拖放系統 | 最接近實體桌遊的操作體驗 |
| **視角** | 第一人稱玩家視角 | 如同坐在桌前的真實感受 |
| **動畫策略** | 核心優先，漸進增強 | 快速可玩，逐步精緻化 |
| **音效** | 預留接口 | 不阻礙開發，之後易於加入 |

## 技術堆疊

### 前端（全新）
- **React 18** - UI 組件和狀態管理
- **TypeScript** - 型別安全開發
- **Phaser 3** - 遊戲渲染引擎（WebGL/Canvas）
- **Vite** - 現代化建置工具
- **Zustand** - 輕量級狀態管理
- **Socket.IO Client** - WebSocket 通訊

### 後端（升級）
- **Rust + Axum** - 保留現有後端
- **SocketIO-rs / Tokio-tungstenite** - WebSocket 支援
- **現有遊戲邏輯和 AI** - 完全保留

### 開發工具
- **ESLint + Prettier** - 程式碼品質
- **Vitest** - 單元測試
- **React DevTools** - React 除錯
- **Phaser Inspector** - Phaser 場景除錯

## 專案結構

```
Dominion/
├── backend/                    # Rust 後端（升級）
│   ├── crates/
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── websocket.rs    # 新增
│   │   │   │   ├── events.rs       # 新增
│   │   │   │   └── ai/
│   │   │   └── Cargo.toml
│   │   └── shared/             # 遊戲邏輯（保留）
│   └── Cargo.toml
│
├── frontend/                   # 全新前端
│   ├── public/
│   │   └── assets/
│   │       ├── cards/          # 卡片圖片
│   │       ├── textures/       # 材質貼圖
│   │       ├── particles/      # 粒子效果
│   │       └── sounds/         # 音效（預留）
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── components/         # React UI 組件
│   │   │   ├── Lobby/
│   │   │   ├── GameUI/
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── ActionLog.tsx
│   │   │   │   ├── ConfirmModal.tsx
│   │   │   │   └── RulesModal.tsx
│   │   │   └── Settings/
│   │   │
│   │   ├── game/               # Phaser 核心
│   │   │   ├── GameContainer.tsx   # React wrapper
│   │   │   ├── PhaserGame.ts
│   │   │   │
│   │   │   ├── scenes/
│   │   │   │   ├── Preloader.ts    # 資源載入
│   │   │   │   └── TableScene.ts   # 主遊戲場景
│   │   │   │
│   │   │   ├── objects/
│   │   │   │   ├── Card.ts         # 卡片物件
│   │   │   │   ├── CardPile.ts     # 牌堆
│   │   │   │   ├── Hand.ts         # 手牌區
│   │   │   │   ├── SupplyArea.ts   # 供應區
│   │   │   │   └── Table.ts        # 桌面
│   │   │   │
│   │   │   ├── effects/
│   │   │   │   ├── CardAnimations.ts
│   │   │   │   ├── Particles.ts
│   │   │   │   └── CameraEffects.ts
│   │   │   │
│   │   │   └── config/
│   │   │       ├── gameConfig.ts
│   │   │       └── constants.ts
│   │   │
│   │   ├── store/              # Zustand 狀態
│   │   │   ├── gameStore.ts
│   │   │   ├── uiStore.ts
│   │   │   └── settingsStore.ts
│   │   │
│   │   ├── services/
│   │   │   ├── websocket.ts
│   │   │   ├── soundManager.ts     # 預留
│   │   │   └── i18n.ts
│   │   │
│   │   ├── types/
│   │   │   ├── game.ts
│   │   │   ├── websocket.ts
│   │   │   └── phaser.ts
│   │   │
│   │   └── utils/
│   │       ├── cardData.ts
│   │       └── animations.ts
│   │
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
```

## WebSocket 通訊協議

### 客戶端 → 伺服器

```json
{
  "type": "PlayCard" | "BuyCard" | "EndPhase" | "PlayCellar" | ...,
  "payload": {
    "card": "Smithy",
    ...
  }
}
```

### 伺服器 → 客戶端

```json
{
  "type": "GameStateUpdate",
  "payload": {
    "game_state": { /* 完整遊戲狀態 */ },
    "animation_hints": {
      "type": "card_played",
      "from": "hand",
      "to": "play_area",
      "card": "Smithy"
    }
  }
}
```

**動畫提示（Animation Hints）：**
- 伺服器告訴客戶端發生了什麼動作
- 客戶端據此播放對應動畫
- 確保動畫與遊戲狀態同步

## 核心實作要點

### 1. Phaser Card 類別

```typescript
class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardSprite: Phaser.GameObjects.Image;
  private state: 'in_hand' | 'in_play' | 'in_deck' | 'in_supply';

  constructor(scene, x, y, cardName) {
    super(scene, x, y);

    // 設定卡片精靈
    this.cardSprite = scene.add.image(0, 0, `card_${cardName}`);
    this.add(this.cardSprite);

    // 啟用拖放
    this.setInteractive({ draggable: true });
    this.setupDragHandlers();

    // 3D 效果
    this.setDepth(10);
  }

  setupDragHandlers() {
    this.on('dragstart', this.onDragStart, this);
    this.on('drag', this.onDrag, this);
    this.on('dragend', this.onDragEnd, this);
  }

  onDragStart() {
    // 卡片浮起
    this.scene.tweens.add({
      targets: this,
      y: this.y - 20,
      scale: 1.1,
      rotation: 0,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  onDragEnd(pointer, dropped) {
    if (dropped) {
      // 放置成功 - 播放彈跳動畫
      this.playDropAnimation();
    } else {
      // 返回原位
      this.returnToOriginalPosition();
    }
  }

  playDropAnimation() {
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.95,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
  }
}
```

### 2. 手牌扇形排列

```typescript
class Hand {
  arrangeCards(cards: Card[]) {
    const baseY = 600;  // 手牌基準 Y 座標
    const spacing = 100;
    const arcHeight = 30;
    const maxRotation = 15; // 最大旋轉角度

    cards.forEach((card, i) => {
      const t = cards.length > 1 ? i / (cards.length - 1) : 0.5;
      const angle = (t - 0.5) * 2 * maxRotation;
      const x = 400 + (i - cards.length / 2) * spacing;
      const y = baseY + Math.abs(angle) * arcHeight / maxRotation;

      this.scene.tweens.add({
        targets: card,
        x: x,
        y: y,
        rotation: Phaser.Math.DegToRad(angle),
        duration: 300,
        ease: 'Cubic.easeOut'
      });
    });
  }
}
```

### 3. React ↔ Phaser 通訊

```typescript
// React Component
function GameContainer() {
  const phaserRef = useRef<Phaser.Game>();

  useEffect(() => {
    // 監聽 Phaser 事件
    const scene = phaserRef.current?.scene.getScene('TableScene');
    scene?.events.on('card-hovered', (cardData) => {
      // 更新 React UI（如 tooltip）
      setHoveredCard(cardData);
    });
  }, []);

  const handlePlayCard = (card: string) => {
    // React 呼叫 Phaser 方法
    phaserRef.current?.scene.getScene('TableScene')
      .events.emit('play-card', card);
  };
}

// Phaser Scene
class TableScene extends Phaser.Scene {
  create() {
    this.events.on('play-card', (card) => {
      // 執行卡片動畫
      this.playCardAnimation(card);
    });
  }

  onCardHover(card: Card) {
    // 通知 React
    this.events.emit('card-hovered', card.getData());
  }
}
```

### 4. 3D 透視效果

```typescript
// 第一人稱視角配置
class TableScene extends Phaser.Scene {
  create() {
    // 設定相機
    this.cameras.main.setPosition(0, -200);
    this.cameras.main.setAngle(-10); // 向下傾斜 10 度

    // 遠近縮放效果
    this.applyPerspective();
  }

  applyPerspective() {
    // 手牌（近）- 較大
    this.hand.setScale(1.0);
    this.hand.setY(550);

    // 供應區（中）- 中等
    this.supplyArea.setScale(0.7);
    this.supplyArea.setY(250);

    // 對手區域（遠）- 較小
    this.opponentArea.setScale(0.5);
    this.opponentArea.setY(50);
  }
}
```

## 動畫優先級

### Phase 1: 核心動畫（必須）
- ✅ 卡片拖放（拖動、放下、彈跳）
- ✅ 洗牌和發牌
- ✅ 卡片翻面（從牌庫抽牌）
- ✅ 卡片飛行軌跡（購買、移動）

### Phase 2: 增強動畫（優先）
- 🎯 手牌扇形展開/收起
- 🎯 卡片 hover 浮起並傾斜
- 🎯 數字跳動動畫（金幣、分數）
- 🎯 階段切換視角微調

### Phase 3: 高級特效（時間允許）
- ✨ 粒子效果（光芒、魔法）
- ✨ 卡片發光/光暈
- ✨ 桌面光影變化
- ✨ 勝利慶祝動畫
- ✨ AI 思考視覺提示

## 開發路線圖

### Phase 1: 基礎架構（1-2 天）
**目標：** 建立可運行的基本框架

- [ ] Vite + React + TypeScript 專案初始化
- [ ] Phaser 3 整合與基本場景
- [ ] Rust 後端 WebSocket 升級
- [ ] 基本連接測試

**交付物：**
- 能顯示空白桌面的 Phaser 場景
- WebSocket 連接成功
- React UI 框架就緒

---

### Phase 2: 核心遊戲邏輯（2-3 天）
**目標：** 可玩的基本遊戲

- [ ] Card 類別實作（拖放、基本動畫）
- [ ] Hand、SupplyArea、CardPile 物件
- [ ] 遊戲狀態同步（WebSocket）
- [ ] 基本遊戲流程
  - [ ] 發牌
  - [ ] 打出行動卡
  - [ ] 購買卡片
  - [ ] 結束回合

**交付物：**
- 能完成一局完整遊戲
- 所有基本卡片可用
- AI 對戰可運行

---

### Phase 3: 視覺增強（2-3 天）
**目標：** 擬真桌遊視覺效果

- [ ] 3D 透視調整（第一人稱視角）
- [ ] 核心動畫完善
  - [ ] 洗牌動畫
  - [ ] 卡片翻面
  - [ ] 飛行軌跡
- [ ] 材質和光影
  - [ ] 木質桌面材質
  - [ ] 卡片陰影
  - [ ] 環境光效
- [ ] React UI 覆蓋層
  - [ ] TopBar
  - [ ] ActionLog
  - [ ] 確認對話框

**交付物：**
- 視覺效果達到擬真桌遊水準
- 動畫流暢自然
- UI 美觀且功能完整

---

### Phase 4: 整合與優化（1-2 天）
**目標：** 穩定、流暢、完整

- [ ] AI 對戰全面測試
- [ ] 雙語支援（繁中/英文）
- [ ] 錯誤處理和邊界情況
- [ ] 效能優化
  - [ ] 動畫效能
  - [ ] WebSocket 連接穩定性
  - [ ] 記憶體管理
- [ ] 音效接口預留
- [ ] 使用者體驗調整

**交付物：**
- 穩定可發布的版本
- 所有功能測試通過
- 效能指標達標（60 FPS）

---

**總開發時間：6-10 天**

## 成功指標

### 技術指標
- ✅ 遊戲運行穩定，無崩潰
- ✅ 畫面維持 60 FPS
- ✅ WebSocket 延遲 < 100ms
- ✅ 所有核心動畫流暢

### 體驗指標
- ✅ 拖放操作手感自然
- ✅ 第一人稱視角沉浸感強
- ✅ 遊戲邏輯與現有版本一致
- ✅ AI 行為正常

### 功能指標
- ✅ 支援所有現有卡片
- ✅ AI 對戰完整可用
- ✅ 雙語支援完整
- ✅ 遊戲規則說明完整

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| Phaser 學習曲線 | 中 | 先做簡單原型，逐步增加複雜度 |
| WebSocket 複雜度 | 中 | 使用成熟的 Socket.IO 庫 |
| 效能問題 | 高 | 早期進行效能測試，優化關鍵路徑 |
| 拖放手感調教 | 中 | 多次迭代測試，收集回饋 |
| 開發時間超出 | 低 | 採用漸進式開發，核心優先 |

## 未來擴展

### v2.0 可能功能
- 完整音效系統
- 增強動畫和粒子效果
- 線上多人對戰
- 更多 AI 難度等級
- 卡片收藏和成就系統
- 回放系統

### v3.0 可能功能
- 3D 卡片模型
- 更多擴充卡片
- 錦標賽模式
- 觀戰系統

## 結論

這個設計方案提供了一個清晰的路徑，從現有的 Vanilla JS 實作遷移到現代化的 React + Phaser 3 架構，同時保留穩定的 Rust 後端。通過漸進式開發策略，我們能夠快速實現可玩版本，然後逐步增強視覺效果和使用者體驗，最終打造出一個具有擬真桌遊風格的精緻卡牌遊戲。
