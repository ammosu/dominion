export interface CardData {
  name: { en: string; zh: string };
  type: 'treasure' | 'victory' | 'action' | 'curse';
  cost: number;
  art?: string;
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
    art: '/assets/cards/copper.webp',
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
  Militia: {
    name: { en: 'Militia', zh: '民兵' },
    type: 'action',
    cost: 4,
    desc: { en: '+2 Coins', zh: '+2 金幣' },
    tooltip: { en: '+2 Coins. Each other player discards down to 3 cards.', zh: '+2 金幣。其他玩家棄牌至 3 張。' },
  },
  Mine: {
    name: { en: 'Mine', zh: '礦山' },
    type: 'action',
    cost: 5,
    desc: { en: 'Upgrade a Treasure', zh: '升級寶物牌' },
    tooltip: { en: 'Trash a Treasure from hand. Gain a Treasure costing up to 3 more to hand.', zh: '從手牌中移除一張寶物牌，獲得一張價值不超過多 3 的寶物牌到手牌。' },
  },
  Moat: {
    name: { en: 'Moat', zh: '護城河' },
    type: 'action',
    cost: 2,
    desc: { en: '+2 Cards', zh: '+2 張牌' },
    tooltip: { en: 'Draw 2 cards. Reaction: Reveal to block attacks.', zh: '抽 2 張牌。反應：展示以阻擋攻擊。' },
  },
  Remodel: {
    name: { en: 'Remodel', zh: '改造' },
    type: 'action',
    cost: 4,
    desc: { en: 'Trash & Gain', zh: '移除並獲得' },
    tooltip: { en: 'Trash a card from hand. Gain a card costing up to 2 more.', zh: '從手牌移除一張牌，獲得一張價值不超過多 2 的牌。' },
  },
  Woodcutter: {
    name: { en: 'Woodcutter', zh: '樵夫' },
    type: 'action',
    cost: 3,
    desc: { en: '+1 Buy, +2 Coins', zh: '+1 購買、+2 金幣' },
    tooltip: { en: '+1 Buy, +2 Coins.', zh: '+1 購買、+2 金幣。' },
  },
};

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

export function getCardName(cardName: string, lang: 'en' | 'zh'): string {
  return CARD_DATA[cardName]?.name[lang] || cardName;
}

export interface ConfiguredCardArt {
  cardName: string;
  path: string;
  textureKey: string;
}

export function getCardArtPath(cardName: string): string | undefined {
  return CARD_DATA[cardName]?.art;
}

export function getCardTextureKey(cardName: string): string {
  return `card-art-${cardName.toLowerCase()}`;
}

export function getConfiguredCardArt(): ConfiguredCardArt[] {
  return Object.entries(CARD_DATA).flatMap(([cardName, data]) =>
    data.art
      ? [{ cardName, path: data.art, textureKey: getCardTextureKey(cardName) }]
      : [],
  );
}
