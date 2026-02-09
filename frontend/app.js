// --- Localization ---
let currentLang = localStorage.getItem("dominion-lang") || "en";

const CARD_DATA = {
  Copper:     { type: "treasure", cost: 0, coins: 1, name: { en: "Copper", zh: "銅幣" }, tooltip: { en: "Worth 1 coin", zh: "價值 1 金幣" } },
  Silver:     { type: "treasure", cost: 3, coins: 2, name: { en: "Silver", zh: "銀幣" }, tooltip: { en: "Worth 2 coins", zh: "價值 2 金幣" } },
  Gold:       { type: "treasure", cost: 6, coins: 3, name: { en: "Gold", zh: "金幣" }, tooltip: { en: "Worth 3 coins", zh: "價值 3 金幣" } },
  Estate:     { type: "victory",  cost: 2, vp: 1, name: { en: "Estate", zh: "莊園" }, tooltip: { en: "Worth 1 Victory Point", zh: "價值 1 分" } },
  Duchy:      { type: "victory",  cost: 5, vp: 3, name: { en: "Duchy", zh: "公國" }, tooltip: { en: "Worth 3 Victory Points", zh: "價值 3 分" } },
  Province:   { type: "victory",  cost: 8, vp: 6, name: { en: "Province", zh: "行省" }, tooltip: { en: "Worth 6 Victory Points", zh: "價值 6 分" } },
  Curse:      { type: "curse",    cost: 0, vp: -1, name: { en: "Curse", zh: "詛咒" }, tooltip: { en: "Worth -1 Victory Point", zh: "價值 -1 分" } },
  Cellar:     { type: "action",   cost: 2, name: { en: "Cellar", zh: "地窖" }, desc: { en: "+1 Action, discard any, +1 Card each", zh: "+1 行動，棄任意張牌，每張抽 1 張牌" }, tooltip: { en: "Discard any number of cards, then draw that many. Gives +1 Action.", zh: "棄掉任意數量的牌，然後抽取相同數量的牌。+1 行動。" } },
  Market:     { type: "action",   cost: 5, name: { en: "Market", zh: "市集" }, desc: { en: "+1 Card, +1 Action, +1 Buy, +1 Coin", zh: "+1 張牌、+1 行動、+1 購買、+1 金幣" }, tooltip: { en: "Draw 1 card. +1 Action, +1 Buy, +1 Coin.", zh: "抽 1 張牌。+1 行動、+1 購買、+1 金幣。" } },
  Militia:    { type: "action",   cost: 4, name: { en: "Militia", zh: "義勇軍" }, desc: { en: "+2 Coins, others discard to 3", zh: "+2 金幣，其他玩家棄牌至 3 張" }, tooltip: { en: "+2 Coins. Each other player discards down to 3 cards in hand.", zh: "+2 金幣。每個其他玩家將手牌棄至 3 張。" } },
  Mine:       { type: "action",   cost: 5, name: { en: "Mine", zh: "礦坑" }, desc: { en: "Trash Treasure, gain +3 cost to hand", zh: "廢棄財寶牌，獲得價值 +3 的財寶牌到手牌" }, tooltip: { en: "Trash a Treasure from hand. Gain a Treasure to hand costing up to 3 more.", zh: "從手牌廢棄一張財寶牌。獲得一張價值多至多 3 的財寶牌到手牌。" } },
  Moat:       { type: "action",   cost: 2, name: { en: "Moat", zh: "護城河" }, desc: { en: "+2 Cards, blocks Attacks", zh: "+2 張牌，抵擋攻擊" }, tooltip: { en: "Draw 2 cards. When another player plays an Attack, you may reveal this to be unaffected.", zh: "抽 2 張牌。當其他玩家打出攻擊牌時，你可以展示此牌以不受影響。" } },
  Remodel:    { type: "action",   cost: 4, name: { en: "Remodel", zh: "重建" }, desc: { en: "Trash card, gain +2 cost", zh: "廢棄 1 張牌，獲得價值 +2 的牌" }, tooltip: { en: "Trash a card from hand. Gain a card costing up to 2 more than it.", zh: "從手牌廢棄一張牌。獲得一張價值多至多 2 的牌。" } },
  Smithy:     { type: "action",   cost: 4, name: { en: "Smithy", zh: "鐵匠" }, desc: { en: "+3 Cards", zh: "+3 張牌" }, tooltip: { en: "Draw 3 cards from your deck.", zh: "從你的牌庫抽 3 張牌。" } },
  Village:    { type: "action",   cost: 3, name: { en: "Village", zh: "村莊" }, desc: { en: "+1 Card, +2 Actions", zh: "+1 張牌、+2 行動" }, tooltip: { en: "Draw 1 card. +2 Actions.", zh: "抽 1 張牌。+2 行動。" } },
  Woodcutter: { type: "action",   cost: 3, name: { en: "Woodcutter", zh: "伐木工" }, desc: { en: "+1 Buy, +2 Coins", zh: "+1 購買、+2 金幣" }, tooltip: { en: "+1 Buy and +2 Coins.", zh: "+1 購買、+2 金幣。" } },
  Workshop:   { type: "action",   cost: 3, name: { en: "Workshop", zh: "工作室" }, desc: { en: "Gain card costing up to 4", zh: "獲得價值至多 4 的牌" }, tooltip: { en: "Gain a card costing up to 4.", zh: "獲得一張價值至多 4 的牌。" } },
};

const UI_TEXT = {
  treasure: { en: "Treasure", zh: "財寶" },
  victory: { en: "Victory", zh: "分數" },
  curse: { en: "Curse", zh: "詛咒" },
  kingdom: { en: "Kingdom", zh: "王國" },
  action: { en: "Action", zh: "行動" },
  buy: { en: "Buy", zh: "購買" },
  cleanup: { en: "Cleanup", zh: "清場" },
  actions: { en: "Actions", zh: "行動" },
  buys: { en: "Buys", zh: "購買" },
  coins: { en: "Coins", zh: "金幣" },
  coin: { en: "Coin", zh: "金幣" },
  vp: { en: "VP", zh: "分" },
  hand: { en: "Hand", zh: "手牌" },
  deck: { en: "Deck", zh: "牌庫" },
  discard: { en: "Discard", zh: "棄牌堆" },
  players: { en: "Players", zh: "玩家" },
  log: { en: "Log", zh: "記錄" },
  yourHand: { en: "Your Hand", zh: "你的手牌" },
  supply: { en: "Supply", zh: "供應區" },
  left: { en: "left", zh: "剩餘" },
  endActions: { en: "End Actions", zh: "結束行動" },
  endTurn: { en: "End Turn", zh: "結束回合" },
  playAllTreasures: { en: "Play All Treasures", zh: "打出所有財寶" },
  cancel: { en: "Cancel", zh: "取消" },
  confirmCellar: { en: "Confirm Cellar (discard", zh: "確認地窖（棄" },
  selectSupplyUpTo4: { en: "Select a supply pile costing 4 or less", zh: "選擇價值至多 4 的供應堆" },
  selectTreasureTrash: { en: "Select a Treasure from hand to trash", zh: "從手牌選擇財寶牌廢棄" },
  trashing: { en: "Trashing", zh: "廢棄" },
  selectTreasureUpTo: { en: "Select a Treasure costing up to", zh: "選擇價值至多" },
  selectCardTrash: { en: "Select a card from hand to trash", zh: "從手牌選擇一張牌廢棄" },
  selectCardUpTo: { en: "Select a card costing up to", zh: "選擇價值至多" },
  gameOver: { en: "Game Over", zh: "遊戲結束" },
  newGame: { en: "New Game", zh: "新遊戲" },
  startGame: { en: "Start Game", zh: "開始遊戲" },
  playerName: { en: "Player", zh: "玩家" },
  name: { en: "name", zh: "名稱" },
  gameStarted: { en: "Game started!", zh: "遊戲開始！" },
  confirmPurchase: { en: "Confirm Purchase", zh: "確認購買" },
  confirm: { en: "Confirm", zh: "確認" },
  hintEndActions: { en: "💡 No actions to play - click 'End Actions' to continue", zh: "💡 沒有可打出的行動卡 - 點擊「結束行動」繼續" },
  hintEndTurn: { en: "💡 Click 'End Turn' when you're done buying", zh: "💡 購買完畢後點擊「結束回合」" },
};

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

function t(key) {
  return UI_TEXT[key]?.[currentLang] || key;
}

function getCardName(name) {
  return CARD_DATA[name]?.name[currentLang] || name;
}

const SUPPLY_GROUPS = [
  { label: "treasure", cards: ["Copper", "Silver", "Gold"] },
  { label: "victory",  cards: ["Estate", "Duchy", "Province"] },
  { label: "curse",    cards: ["Curse"] },
  { label: "kingdom",  cards: ["Cellar", "Market", "Militia", "Mine", "Moat", "Remodel", "Smithy", "Village", "Woodcutter", "Workshop"] },
];

// --- State ---
let gameId = null;
let game = null;
// UI modes: "normal" | "cellar-select" | "workshop-select"
//         | "mine-trash-select" | "mine-gain-select"
//         | "remodel-trash-select" | "remodel-gain-select"
let uiMode = "normal";
let cellarSelected = new Set(); // indices into hand for cellar discard
let pendingTrash = null; // card being trashed for mine/remodel gain step

// --- API ---
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Unknown error");
  }
  return res.json();
}

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

function showError(msg) {
  const entries = document.getElementById("log-entries");
  const el = document.createElement("div");
  el.className = "log-entry";
  el.style.color = "#ef5350";
  el.textContent = "Error: " + msg;
  entries.appendChild(el);
  entries.scrollTop = entries.scrollHeight;
}

function cancelMode() {
  uiMode = "normal";
  cellarSelected.clear();
  pendingTrash = null;
  render();
}

// --- Helpers ---
function cardDetail(name) {
  const d = CARD_DATA[name];
  // Use tooltip for detailed descriptions
  if (d.tooltip) return d.tooltip[currentLang];
  // Fallback to short desc
  if (d.desc) return d.desc[currentLang];
  if (d.coins) return currentLang === "zh" ? `+${d.coins} ${t("coin")}` : `+${d.coins} ${t("coin")}${d.coins > 1 ? "s" : ""}`;
  if (d.vp !== undefined) return `${d.vp > 0 ? "+" : ""}${d.vp} ${t("vp")}`;
  return t("action");
}

function cardShortDetail(name) {
  const d = CARD_DATA[name];
  if (d.coins) return currentLang === "zh" ? `+${d.coins} ${t("coin")}` : `+${d.coins} ${t("coin")}${d.coins > 1 ? "s" : ""}`;
  if (d.vp !== undefined) return `${d.vp > 0 ? "+" : ""}${d.vp} ${t("vp")}`;
  return t("action");
}

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

function openRulesModal() {
  document.getElementById("rules-modal").classList.remove("hidden");
  renderRulesContent();
}

function closeRulesModal() {
  document.getElementById("rules-modal").classList.add("hidden");
}

// --- Confirm Modal ---
function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    titleEl.textContent = t("confirmPurchase");
    messageEl.textContent = message;
    okBtn.textContent = t("confirm");
    cancelBtn.textContent = t("cancel");
    modal.classList.remove("hidden");

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.add("hidden");
      okBtn.removeEventListener("click", handleOk);
      cancelBtn.removeEventListener("click", handleCancel);
    };

    okBtn.addEventListener("click", handleOk);
    cancelBtn.addEventListener("click", handleCancel);
  });
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

function currentPlayer() {
  return game.players[game.current_player];
}

// --- Render ---
function render() {
  renderTurnInfo();
  renderSupply();
  renderHand();
  renderPlayers();
  renderLog();
}

function renderTurnInfo() {
  const player = currentPlayer();
  document.getElementById("current-player").textContent = player.name;

  const badge = document.getElementById("phase-badge");
  badge.textContent = t(game.phase.toLowerCase());
  badge.className = game.phase === "Buy" ? "buy-phase" : "";

  document.getElementById("actions-counter").textContent = `${t("actions")}: ${player.actions}`;
  document.getElementById("buys-counter").textContent = `${t("buys")}: ${player.buys}`;
  document.getElementById("coins-counter").textContent = `${t("coins")}: ${player.coins}`;

  // Show hint when appropriate
  const hintEl = document.getElementById("phase-hint");
  let showHint = false;
  let hintText = "";

  if (game.phase === "Action") {
    // Check if player has any action cards in hand
    const hasActionCards = player.hand.some(cardName => CARD_DATA[cardName]?.type === "action");
    // Show hint if no actions left OR no action cards in hand
    if (player.actions === 0 || !hasActionCards) {
      showHint = true;
      hintText = t("hintEndActions");
    }
  }

  if (showHint) {
    hintEl.textContent = hintText;
    hintEl.classList.remove("hidden");
  } else {
    hintEl.classList.add("hidden");
  }

  const btns = document.getElementById("phase-buttons");
  btns.innerHTML = "";

  // Language toggle button
  const langBtn = document.createElement("button");
  langBtn.className = "secondary";
  langBtn.textContent = currentLang === "en" ? "中文" : "EN";
  langBtn.onclick = toggleLanguage;
  btns.appendChild(langBtn);

  // Rules button
  const rulesBtn = document.createElement("button");
  rulesBtn.className = "secondary";
  rulesBtn.textContent = "?";
  rulesBtn.title = currentLang === "en" ? "Game Rules" : "遊戲規則";
  rulesBtn.onclick = openRulesModal;
  btns.appendChild(rulesBtn);

  if (game.phase === "Action") {
    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = t("endActions");
    btn.onclick = () => sendAction({ action: "EndPhase" });
    btns.appendChild(btn);
  } else if (game.phase === "Buy") {
    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = t("endTurn");
    btn.onclick = () => sendAction({ action: "EndPhase" });
    btns.appendChild(btn);
  }
}

function renderSupply() {
  const grid = document.getElementById("supply-grid");
  grid.innerHTML = "";

  const player = currentPlayer();
  const isBuyPhase = game.phase === "Buy";

  for (const group of SUPPLY_GROUPS) {
    const label = document.createElement("div");
    label.className = "supply-group-label";
    label.textContent = t(group.label);
    grid.appendChild(label);

    const row = document.createElement("div");
    row.className = "supply-row";

    for (const cardName of group.cards) {
      const count = game.supply[cardName] ?? 0;
      const data = CARD_DATA[cardName];

      const canBuy = isBuyPhase && count > 0 && player.buys > 0 && player.coins >= data.cost;
      const canWorkshopGain = uiMode === "workshop-select" && count > 0 && data.cost <= 4;
      const canMineGain = uiMode === "mine-gain-select" && count > 0
        && data.type === "treasure" && pendingTrash && data.cost <= CARD_DATA[pendingTrash].cost + 3;
      const canRemodelGain = uiMode === "remodel-gain-select" && count > 0
        && pendingTrash && data.cost <= CARD_DATA[pendingTrash].cost + 2;
      const clickable = canBuy || canWorkshopGain || canMineGain || canRemodelGain;

      const pile = document.createElement("div");
      pile.className = `supply-pile ${data.type}${clickable ? " clickable" : ""}${count === 0 ? " empty" : ""}`;
      pile.dataset.tooltip = cardDetail(cardName);
      pile.innerHTML = `
        <span class="card-cost">${data.cost}</span>
        <span class="card-name">${getCardName(cardName)}</span>
        <span class="card-detail">${cardShortDetail(cardName)}</span>
        <span class="pile-count">${count} ${t("left")}</span>
      `;

      if (canWorkshopGain) {
        pile.onclick = () => sendAction({ action: "PlayWorkshop", gain: cardName });
      } else if (canMineGain) {
        pile.onclick = () => sendAction({ action: "PlayMine", trash: pendingTrash, gain: cardName });
      } else if (canRemodelGain) {
        pile.onclick = () => sendAction({ action: "PlayRemodel", trash: pendingTrash, gain: cardName });
      } else if (canBuy) {
        pile.onclick = async () => {
          const cardDisplayName = getCardName(cardName);
          const cost = data.cost;
          const confirmMsg = currentLang === "zh"
            ? `購買 ${cardDisplayName}（花費 ${cost} 金幣）`
            : `Buy ${cardDisplayName} for ${cost} coin${cost === 1 ? '' : 's'}`;

          const confirmed = await showConfirmModal(confirmMsg);
          if (confirmed) {
            sendAction({ action: "BuyCard", card: cardName });
          }
        };
      }

      row.appendChild(pile);
    }

    grid.appendChild(row);
  }
}

function renderHand() {
  const hand = document.getElementById("hand");
  hand.innerHTML = "";

  const player = currentPlayer();
  const isActionPhase = game.phase === "Action";
  const isBuyPhase = game.phase === "Buy";

  player.hand.forEach((cardName, index) => {
    const data = CARD_DATA[cardName];
    const isAction = data.type === "action";
    const isTreasure = data.type === "treasure";

    let clickable = false;
    let selected = false;
    let dimmed = false;

    if (uiMode === "cellar-select") {
      clickable = true;
      selected = cellarSelected.has(index);
    } else if (uiMode === "workshop-select" || uiMode === "mine-gain-select" || uiMode === "remodel-gain-select") {
      dimmed = true;
    } else if (uiMode === "mine-trash-select") {
      // Only treasures can be selected for Mine trash
      clickable = isTreasure;
      dimmed = !isTreasure;
    } else if (uiMode === "remodel-trash-select") {
      // Any card can be selected for Remodel trash
      clickable = true;
    } else if (isActionPhase && isAction && player.actions > 0) {
      clickable = true;
    } else if (isBuyPhase && isTreasure) {
      clickable = true;
    }

    const card = document.createElement("div");
    card.className = `hand-card ${data.type}${clickable ? " clickable" : ""}${selected ? " selected" : ""}${dimmed ? " dimmed" : ""}`;
    card.dataset.tooltip = cardDetail(cardName);
    card.innerHTML = `
      <span class="card-cost">${data.cost}</span>
      <span class="card-name">${getCardName(cardName)}</span>
      <span class="card-detail">${cardShortDetail(cardName)}</span>
    `;

    if (uiMode === "cellar-select" && clickable) {
      card.onclick = () => {
        if (cellarSelected.has(index)) {
          cellarSelected.delete(index);
        } else {
          cellarSelected.add(index);
        }
        renderHand();
        renderHandButtons();
      };
    } else if (uiMode === "mine-trash-select" && clickable) {
      card.onclick = () => {
        pendingTrash = cardName;
        uiMode = "mine-gain-select";
        render();
      };
    } else if (uiMode === "remodel-trash-select" && clickable) {
      card.onclick = () => {
        pendingTrash = cardName;
        uiMode = "remodel-gain-select";
        render();
      };
    } else if (uiMode === "normal" && clickable) {
      if (isActionPhase && isAction) {
        card.onclick = () => handlePlayAction(cardName);
      } else if (isBuyPhase && isTreasure) {
        card.onclick = () => sendAction({ action: "PlayTreasure", card: cardName });
      }
    }

    hand.appendChild(card);
  });

  renderHandButtons();
}

function renderHandButtons() {
  const btns = document.getElementById("hand-buttons");
  btns.innerHTML = "";

  const player = currentPlayer();
  const isBuyPhase = game.phase === "Buy";
  const hasTreasures = player.hand.some(c => CARD_DATA[c].type === "treasure");

  if (uiMode === "cellar-select") {
    const confirm = document.createElement("button");
    confirm.className = "success";
    confirm.textContent = `${t("confirmCellar")} ${cellarSelected.size})`;
    confirm.onclick = () => {
      const discards = [...cellarSelected].map(i => player.hand[i]);
      sendAction({ action: "PlayCellar", discards });
    };
    btns.appendChild(confirm);
    appendCancelButton(btns);
  } else if (uiMode === "workshop-select") {
    appendModeInfo(btns, t("selectSupplyUpTo4"));
    appendCancelButton(btns);
  } else if (uiMode === "mine-trash-select") {
    appendModeInfo(btns, t("selectTreasureTrash"));
    appendCancelButton(btns);
  } else if (uiMode === "mine-gain-select") {
    const maxCost = CARD_DATA[pendingTrash].cost + 3;
    appendModeInfo(btns, `${t("trashing")} ${getCardName(pendingTrash)}. ${t("selectTreasureUpTo")} ${maxCost}`);
    appendCancelButton(btns);
  } else if (uiMode === "remodel-trash-select") {
    appendModeInfo(btns, t("selectCardTrash"));
    appendCancelButton(btns);
  } else if (uiMode === "remodel-gain-select") {
    const maxCost = CARD_DATA[pendingTrash].cost + 2;
    appendModeInfo(btns, `${t("trashing")} ${getCardName(pendingTrash)}. ${t("selectCardUpTo")} ${maxCost}`);
    appendCancelButton(btns);
  } else if (isBuyPhase && hasTreasures) {
    const btn = document.createElement("button");
    btn.textContent = t("playAllTreasures");
    btn.onclick = () => sendAction({ action: "PlayAllTreasures" });
    btns.appendChild(btn);
  }
}

function appendModeInfo(container, text) {
  const info = document.createElement("span");
  info.style.cssText = "color: var(--highlight); font-size: 0.85rem; font-weight: 600;";
  info.textContent = text;
  container.appendChild(info);
}

function appendCancelButton(container) {
  const cancel = document.createElement("button");
  cancel.className = "secondary";
  cancel.textContent = t("cancel");
  cancel.onclick = cancelMode;
  container.appendChild(cancel);
}

function handlePlayAction(cardName) {
  if (cardName === "Cellar") {
    uiMode = "cellar-select";
    cellarSelected.clear();
    render();
  } else if (cardName === "Workshop") {
    uiMode = "workshop-select";
    render();
  } else if (cardName === "Mine") {
    uiMode = "mine-trash-select";
    render();
  } else if (cardName === "Remodel") {
    uiMode = "remodel-trash-select";
    render();
  } else if (cardName === "Militia") {
    sendAction({ action: "PlayMilitia" });
  } else {
    sendAction({ action: "PlayCard", card: cardName });
  }
}

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

function translateLog(msg) {
  if (currentLang === "en") return msg;

  // Translate card names in the message
  let translated = msg;
  for (const [cardKey, cardData] of Object.entries(CARD_DATA)) {
    const enName = cardData.name.en;
    const zhName = cardData.name.zh;
    translated = translated.replace(new RegExp(enName, 'g'), zhName);
  }

  // Translate common log patterns
  translated = translated
    // Turn announcement
    .replace(/(\[AI\] )?(.+)'s turn/, (m, ai, name) => `${ai || ""}${name} 的回合`)
    // Played card patterns (order matters - more specific first!)
    .replace(/played (.+), \+(\d+) action, \+(\d+) buy, \+(\d+) coin, drew (\d+) card/, "打出了 $1，+$2 行動、+$3 購買、+$4 金幣，抽了 $5 張牌")
    .replace(/played (.+), \+(\d+) actions?, drew (\d+) cards?/, "打出了 $1，+$2 行動，抽了 $3 張牌")
    .replace(/played (.+), \+(\d+) coins?/, "打出了 $1，+$2 金幣")
    .replace(/played (.+), \+(\d+) buy, \+(\d+) coins?/, "打出了 $1，+$2 購買、+$3 金幣")
    .replace(/played (.+), drew (\d+) cards?/, "打出了 $1，抽了 $2 張牌")
    .replace(/played (.+), discarded (\d+), drew (\d+)/, "打出了 $1，棄了 $2 張牌，抽了 $3 張牌")
    .replace(/played (.+), gained (.+)/, "打出了 $1，獲得了 $2")
    .replace(/played (.+), trashed (.+), gained (.+) to hand/, "打出了 $1，廢棄了 $2，獲得 $3 到手牌")
    .replace(/played (.+), trashed (.+), gained (.+)/, "打出了 $1，廢棄了 $2，獲得了 $3")
    .replace(/played (.+) for \+(\d+) coin\(s\)/, "打出了 $1，獲得 $2 金幣")
    .replace(/played all treasures for \+(\d+) coin\(s\)/, "打出所有財寶，獲得 $1 金幣")
    // Buy/Gain
    .replace(/bought (.+)/, "購買了 $1")
    .replace(/gained (.+) to hand/, "獲得 $1 到手牌")
    // Phase end
    .replace(/ended Action phase/, "結束行動階段")
    .replace(/ended turn/, "結束回合")
    // Moat defense
    .replace(/reveals (.+), unaffected/, "展示了 $1，不受影響")
    // Militia effects
    .replace(/discards (.+)/, "棄了 $1")
    // Game over
    .replace(/Game over!/, "遊戲結束！")
    .replace(/(.+): (\d+) points/, "$1：$2 分");

  return translated;
}

function renderLog() {
  const logContainer = document.getElementById("action-log");
  const entries = document.getElementById("log-entries");
  entries.innerHTML = "";

  for (const msg of game.log) {
    const el = document.createElement("div");
    el.className = "log-entry";
    el.textContent = translateLog(msg);
    entries.appendChild(el);
  }
  // Scroll the log container to bottom to show latest entries
  logContainer.scrollTop = logContainer.scrollHeight;
}

// --- Game Over ---
function showGameOver() {
  const overlay = document.getElementById("game-over");
  overlay.classList.remove("hidden");

  const scoresEl = document.getElementById("final-scores");
  scoresEl.innerHTML = "";

  const scores = game.players.map(p => {
    const total = [...p.hand, ...p.deck, ...p.discard]
      .reduce((sum, c) => sum + (CARD_DATA[c]?.vp || 0), 0);
    return { name: p.name, score: total };
  });

  scores.sort((a, b) => b.score - a.score);
  const maxScore = scores[0].score;

  for (const s of scores) {
    const row = document.createElement("div");
    row.className = `score-row${s.score === maxScore ? " winner" : ""}`;
    row.innerHTML = `<span>${s.name}</span><span>${s.score} ${t("vp")}</span>`;
    scoresEl.appendChild(row);
  }
}

// --- AI Turn Execution ---
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

// --- Update Static Text ---
function updateStaticText() {
  // Lobby
  document.querySelector("#lobby-box h1").textContent = currentLang === "zh" ? "皇輿爭霸" : "Dominion";
  document.getElementById("start-game-btn").textContent = t("startGame");
  const inputs = document.querySelectorAll(".player-name-input");
  inputs.forEach((input, i) => {
    input.placeholder = `${t("playerName")} ${i + 1} ${t("name")}`;
  });

  // Rules button
  const rulesBtnText = document.querySelector("#rules-btn-lobby .rules-btn-text");
  if (rulesBtnText) {
    rulesBtnText.textContent = currentLang === "en" ? "Game Rules" : "遊戲規則";
  }

  // AI labels
  document.querySelectorAll(".ai-label").forEach(label => {
    label.textContent = currentLang === "zh" ? "電腦" : "AI";
  });

  // Game screen
  document.querySelector("#supply h2").textContent = t("supply");
  document.querySelector("#players-sidebar h2").textContent = t("players");
  document.querySelector("#action-log h2").textContent = t("log");
  document.querySelector("#hand-header h2").textContent = t("yourHand");

  // Game over
  document.querySelector("#game-over-box h1").textContent = t("gameOver");
  document.getElementById("new-game-btn").textContent = t("newGame");
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  updateStaticText();
});

document.getElementById("rules-btn-lobby").addEventListener("click", openRulesModal);

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

document.getElementById("new-game-btn").addEventListener("click", () => {
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");
  gameId = null;
  game = null;
  updateStaticText();
});
