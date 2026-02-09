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

function cardDetail(name) {
  const d = CARD_DATA[name];
  if (d.coins) return `+${d.coins} Coin${d.coins > 1 ? "s" : ""}`;
  if (d.vp !== undefined) return `${d.vp > 0 ? "+" : ""}${d.vp} VP`;
  return "Action";
}

function renderTurnInfo(game) {
  const player = game.players[game.current_player];
  document.getElementById("current-player").textContent = player.name;
  document.getElementById("phase-badge").textContent = game.phase;
  document.getElementById("actions-counter").textContent = `Actions: ${player.actions}`;
  document.getElementById("buys-counter").textContent = `Buys: ${player.buys}`;
  document.getElementById("coins-counter").textContent = `Coins: ${player.coins}`;
}

function renderSupply(game) {
  const grid = document.getElementById("supply-grid");
  grid.innerHTML = "";

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

      const pile = document.createElement("div");
      pile.className = `supply-pile ${data.type}`;
      pile.innerHTML = `
        <span class="card-cost">${data.cost}</span>
        <span class="card-name">${cardName}</span>
        <span class="card-detail">${cardDetail(cardName)}</span>
        <span class="pile-count">${count} left</span>
      `;
      row.appendChild(pile);
    }

    grid.appendChild(row);
  }
}

function renderHand(game) {
  const hand = document.getElementById("hand");
  hand.innerHTML = "";

  const player = game.players[game.current_player];
  for (const cardName of player.hand) {
    const data = CARD_DATA[cardName];
    const card = document.createElement("div");
    card.className = `hand-card ${data.type}`;
    card.innerHTML = `
      <span class="card-cost">${data.cost}</span>
      <span class="card-name">${cardName}</span>
      <span class="card-detail">${cardDetail(cardName)}</span>
    `;
    hand.appendChild(card);
  }
}

function renderPlayers(game) {
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

async function init() {
  const res = await fetch("/api/game/new");
  const game = await res.json();

  renderTurnInfo(game);
  renderSupply(game);
  renderHand(game);
  renderPlayers(game);
}

init();
