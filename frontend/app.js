// --- Localization ---
let currentLang = localStorage.getItem("dominion-lang") || "en";

const CARD_DATA = {
  Copper:     { type: "treasure", cost: 0, coins: 1, name: { en: "Copper", zh: "銅幣" } },
  Silver:     { type: "treasure", cost: 3, coins: 2, name: { en: "Silver", zh: "銀幣" } },
  Gold:       { type: "treasure", cost: 6, coins: 3, name: { en: "Gold", zh: "金幣" } },
  Estate:     { type: "victory",  cost: 2, vp: 1, name: { en: "Estate", zh: "莊園" } },
  Duchy:      { type: "victory",  cost: 5, vp: 3, name: { en: "Duchy", zh: "公國" } },
  Province:   { type: "victory",  cost: 8, vp: 6, name: { en: "Province", zh: "行省" } },
  Curse:      { type: "curse",    cost: 0, vp: -1, name: { en: "Curse", zh: "詛咒" } },
  Cellar:     { type: "action",   cost: 2, name: { en: "Cellar", zh: "地窖" }, desc: { en: "+1 Action, discard any, +1 Card each", zh: "+1 行動，棄任意張牌，每張抽 1 張牌" } },
  Market:     { type: "action",   cost: 5, name: { en: "Market", zh: "市集" }, desc: { en: "+1 Card, +1 Action, +1 Buy, +1 Coin", zh: "+1 張牌、+1 行動、+1 購買、+1 金幣" } },
  Militia:    { type: "action",   cost: 4, name: { en: "Militia", zh: "義勇軍" }, desc: { en: "+2 Coins, others discard to 3", zh: "+2 金幣，其他玩家棄牌至 3 張" } },
  Mine:       { type: "action",   cost: 5, name: { en: "Mine", zh: "礦坑" }, desc: { en: "Trash Treasure, gain +3 cost to hand", zh: "廢棄財寶牌，獲得價值 +3 的財寶牌到手牌" } },
  Moat:       { type: "action",   cost: 2, name: { en: "Moat", zh: "護城河" }, desc: { en: "+2 Cards, blocks Attacks", zh: "+2 張牌，抵擋攻擊" } },
  Remodel:    { type: "action",   cost: 4, name: { en: "Remodel", zh: "重建" }, desc: { en: "Trash card, gain +2 cost", zh: "廢棄 1 張牌，獲得價值 +2 的牌" } },
  Smithy:     { type: "action",   cost: 4, name: { en: "Smithy", zh: "鐵匠" }, desc: { en: "+3 Cards", zh: "+3 張牌" } },
  Village:    { type: "action",   cost: 3, name: { en: "Village", zh: "村莊" }, desc: { en: "+1 Card, +2 Actions", zh: "+1 張牌、+2 行動" } },
  Woodcutter: { type: "action",   cost: 3, name: { en: "Woodcutter", zh: "伐木工" }, desc: { en: "+1 Buy, +2 Coins", zh: "+1 購買、+2 金幣" } },
  Workshop:   { type: "action",   cost: 3, name: { en: "Workshop", zh: "工作室" }, desc: { en: "Gain card costing up to 4", zh: "獲得價值至多 4 的牌" } },
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
    if (game.game_over) showGameOver();
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

  const btns = document.getElementById("phase-buttons");
  btns.innerHTML = "";

  // Language toggle button
  const langBtn = document.createElement("button");
  langBtn.className = "secondary";
  langBtn.textContent = currentLang === "en" ? "中文" : "EN";
  langBtn.onclick = toggleLanguage;
  btns.appendChild(langBtn);

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
        pile.onclick = () => sendAction({ action: "BuyCard", card: cardName });
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
    card.innerHTML = `
      <div class="player-name">${player.name}${i === game.current_player ? " ★" : ""}</div>
      <div class="player-stats">
        <div class="stat"><span>${t("hand")}</span><span>${player.hand.length}</span></div>
        <div class="stat"><span>${t("deck")}</span><span>${player.deck.length}</span></div>
        <div class="stat"><span>${t("discard")}</span><span>${player.discard.length}</span></div>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderLog() {
  const entries = document.getElementById("log-entries");
  entries.innerHTML = "";

  for (const msg of game.log) {
    const el = document.createElement("div");
    el.className = "log-entry";
    el.textContent = msg;
    entries.appendChild(el);
  }
  entries.scrollTop = entries.scrollHeight;
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

// --- Update Static Text ---
function updateStaticText() {
  // Lobby
  document.querySelector("#lobby-box h1").textContent = currentLang === "zh" ? "皇輿爭霸" : "Dominion";
  document.getElementById("start-game-btn").textContent = t("startGame");
  const inputs = document.querySelectorAll(".player-name-input");
  inputs.forEach((input, i) => {
    input.placeholder = `${t("playerName")} ${i + 1} ${t("name")}`;
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

document.getElementById("start-game-btn").addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".player-name-input");
  const names = [...inputs].map(i => i.value.trim()).filter(n => n);
  if (names.length < 2) {
    alert(currentLang === "zh" ? "請輸入至少 2 位玩家名稱" : "Enter at least 2 player names");
    return;
  }

  const data = await apiPost("/api/game/new", { player_names: names });
  gameId = data.game_id;
  game = data.state;

  document.getElementById("lobby").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  render();
});

document.getElementById("new-game-btn").addEventListener("click", () => {
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("lobby").classList.remove("hidden");
  gameId = null;
  game = null;
  updateStaticText();
});
