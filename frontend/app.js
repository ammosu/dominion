const CARD_DATA = {
  Copper:   { type: "treasure", cost: 0, coins: 1 },
  Silver:   { type: "treasure", cost: 3, coins: 2 },
  Gold:     { type: "treasure", cost: 6, coins: 3 },
  Estate:   { type: "victory",  cost: 2, vp: 1 },
  Duchy:    { type: "victory",  cost: 5, vp: 3 },
  Province: { type: "victory",  cost: 8, vp: 6 },
  Curse:    { type: "curse",    cost: 0, vp: -1 },
  Cellar:   { type: "action",   cost: 2 },
  Market:   { type: "action",   cost: 5 },
  Smithy:   { type: "action",   cost: 4 },
  Village:  { type: "action",   cost: 3 },
  Workshop: { type: "action",   cost: 3 },
};

const SUPPLY_GROUPS = [
  { label: "Treasure", cards: ["Copper", "Silver", "Gold"] },
  { label: "Victory",  cards: ["Estate", "Duchy", "Province"] },
  { label: "Curse",    cards: ["Curse"] },
  { label: "Kingdom",  cards: ["Cellar", "Market", "Smithy", "Village", "Workshop"] },
];

// --- State ---
let gameId = null;
let game = null;
let uiMode = "normal"; // "normal" | "cellar-select" | "workshop-select"
let cellarSelected = new Set(); // indices into hand for cellar discard selection

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
    render();
    if (game.game_over) showGameOver();
  } catch (e) {
    showError(e.message);
  }
}

function showError(msg) {
  // Flash error in the log
  const entries = document.getElementById("log-entries");
  const el = document.createElement("div");
  el.className = "log-entry";
  el.style.color = "#ef5350";
  el.textContent = "Error: " + msg;
  entries.appendChild(el);
  entries.scrollTop = entries.scrollHeight;
}

// --- Helpers ---
function cardDetail(name) {
  const d = CARD_DATA[name];
  if (d.coins) return `+${d.coins} Coin${d.coins > 1 ? "s" : ""}`;
  if (d.vp !== undefined) return `${d.vp > 0 ? "+" : ""}${d.vp} VP`;
  return "Action";
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
  badge.textContent = game.phase;
  badge.className = game.phase === "Buy" ? "buy-phase" : "";

  document.getElementById("actions-counter").textContent = `Actions: ${player.actions}`;
  document.getElementById("buys-counter").textContent = `Buys: ${player.buys}`;
  document.getElementById("coins-counter").textContent = `Coins: ${player.coins}`;

  // Phase buttons
  const btns = document.getElementById("phase-buttons");
  btns.innerHTML = "";

  if (game.phase === "Action") {
    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = "End Actions";
    btn.onclick = () => sendAction({ action: "EndPhase" });
    btns.appendChild(btn);
  } else if (game.phase === "Buy") {
    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = "End Turn";
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
    label.textContent = group.label;
    grid.appendChild(label);

    const row = document.createElement("div");
    row.className = "supply-row";

    for (const cardName of group.cards) {
      const count = game.supply[cardName] ?? 0;
      const data = CARD_DATA[cardName];
      const canBuy = isBuyPhase && count > 0 && player.buys > 0 && player.coins >= data.cost;
      const canWorkshopGain = uiMode === "workshop-select" && count > 0 && data.cost <= 4;
      const clickable = canBuy || canWorkshopGain;

      const pile = document.createElement("div");
      pile.className = `supply-pile ${data.type}${clickable ? " clickable" : ""}${count === 0 ? " empty" : ""}`;
      pile.innerHTML = `
        <span class="card-cost">${data.cost}</span>
        <span class="card-name">${cardName}</span>
        <span class="card-detail">${cardDetail(cardName)}</span>
        <span class="pile-count">${count} left</span>
      `;

      if (canWorkshopGain) {
        pile.onclick = () => sendAction({ action: "PlayWorkshop", gain: cardName });
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
      // In cellar selection mode, any non-Cellar card in hand can be toggled
      clickable = true;
      selected = cellarSelected.has(index);
    } else if (uiMode === "workshop-select") {
      // In workshop selection, hand cards are dimmed (select from supply)
      dimmed = true;
    } else if (isActionPhase && isAction && player.actions > 0) {
      clickable = true;
    } else if (isBuyPhase && isTreasure) {
      clickable = true;
    }

    const card = document.createElement("div");
    card.className = `hand-card ${data.type}${clickable ? " clickable" : ""}${selected ? " selected" : ""}${dimmed ? " dimmed" : ""}`;
    card.innerHTML = `
      <span class="card-cost">${data.cost}</span>
      <span class="card-name">${cardName}</span>
      <span class="card-detail">${cardDetail(cardName)}</span>
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
    confirm.textContent = `Confirm Cellar (discard ${cellarSelected.size})`;
    confirm.onclick = () => {
      const discards = [...cellarSelected].map(i => player.hand[i]);
      sendAction({ action: "PlayCellar", discards });
    };
    btns.appendChild(confirm);

    const cancel = document.createElement("button");
    cancel.className = "secondary";
    cancel.textContent = "Cancel";
    cancel.onclick = () => {
      uiMode = "normal";
      cellarSelected.clear();
      render();
    };
    btns.appendChild(cancel);
  } else if (uiMode === "workshop-select") {
    const info = document.createElement("span");
    info.style.cssText = "color: var(--highlight); font-size: 0.85rem; font-weight: 600;";
    info.textContent = "Select a supply pile costing 4 or less";
    btns.appendChild(info);

    const cancel = document.createElement("button");
    cancel.className = "secondary";
    cancel.textContent = "Cancel";
    cancel.onclick = () => {
      uiMode = "normal";
      render();
    };
    btns.appendChild(cancel);
  } else if (isBuyPhase && hasTreasures) {
    const btn = document.createElement("button");
    btn.textContent = "Play All Treasures";
    btn.onclick = () => sendAction({ action: "PlayAllTreasures" });
    btns.appendChild(btn);
  }
}

function handlePlayAction(cardName) {
  if (cardName === "Cellar") {
    uiMode = "cellar-select";
    cellarSelected.clear();
    render();
  } else if (cardName === "Workshop") {
    uiMode = "workshop-select";
    render();
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
        <div class="stat"><span>Hand</span><span>${player.hand.length}</span></div>
        <div class="stat"><span>Deck</span><span>${player.deck.length}</span></div>
        <div class="stat"><span>Discard</span><span>${player.discard.length}</span></div>
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

  // Calculate scores from the log (last entries have "Name: N points")
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
    row.innerHTML = `<span>${s.name}</span><span>${s.score} VP</span>`;
    scoresEl.appendChild(row);
  }
}

// --- Init ---
document.getElementById("start-game-btn").addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".player-name-input");
  const names = [...inputs].map(i => i.value.trim()).filter(n => n);
  if (names.length < 2) {
    alert("Enter at least 2 player names");
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
});
