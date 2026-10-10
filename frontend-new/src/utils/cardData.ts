export type CardType = 'treasure' | 'victory' | 'action' | 'curse';
type Text = { en: string; zh: string };

export interface CardData {
  name: Text;
  type: CardType;
  /** Extra type-line words, e.g. Action - Attack. */
  subtypes?: ('attack' | 'reaction')[];
  cost: number;
  /** Short summary of the card's bonuses. */
  desc?: Text;
  /** Full card text (Dominion 2nd edition wording). */
  tooltip?: Text;
  coins?: number;
  vp?: number;
}

// Kingdom card names marked "provisional" have no confirmed official zh-TW name in this project.
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
    name: { en: 'Gold', zh: '黃金' },
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

  // ----- Kingdom cards (cost order) -----
  Cellar: {
    name: { en: 'Cellar', zh: '地窖' },
    type: 'action',
    cost: 2,
    desc: { en: '+1 Action', zh: '+1 行動' },
    tooltip: {
      en: '+1 Action. Discard any number of cards, then draw that many.',
      zh: '+1 行動。棄掉任意數量的手牌，然後抽等量的牌。',
    },
  },
  Chapel: {
    name: { en: 'Chapel', zh: '禮拜堂' },
    type: 'action',
    cost: 2,
    desc: { en: 'Trash up to 4', zh: '移除至多 4 張' },
    tooltip: { en: 'Trash up to 4 cards from your hand.', zh: '從手牌移除至多 4 張牌。' },
  },
  Moat: {
    name: { en: 'Moat', zh: '護城河' },
    type: 'action',
    subtypes: ['reaction'],
    cost: 2,
    desc: { en: '+2 Cards', zh: '+2 張牌' },
    tooltip: {
      en: '+2 Cards. When another player plays an Attack card, you may first reveal this from your hand, to be unaffected by it.',
      zh: '+2 張牌。其他玩家打出攻擊牌時，你可以先從手牌展示此牌，使自己不受該攻擊影響。',
    },
  },
  Harbinger: {
    name: { en: 'Harbinger', zh: '先鋒' },
    type: 'action',
    cost: 3,
    desc: { en: '+1 Card, +1 Action', zh: '+1 張牌、+1 行動' },
    tooltip: {
      en: '+1 Card, +1 Action. Look through your discard pile. You may put a card from it onto your deck.',
      zh: '+1 張牌、+1 行動。檢視你的棄牌堆，你可以將其中一張牌放到牌庫頂。',
    },
  },
  Merchant: {
    name: { en: 'Merchant', zh: '商人' },
    type: 'action',
    cost: 3,
    desc: { en: '+1 Card, +1 Action', zh: '+1 張牌、+1 行動' },
    tooltip: {
      en: '+1 Card, +1 Action. The first time you play a Silver this turn, +1 coin.',
      zh: '+1 張牌、+1 行動。本回合你第一次打出銀幣時，+1 金幣。',
    },
  },
  Vassal: {
    name: { en: 'Vassal', zh: '家臣' },
    type: 'action',
    cost: 3,
    desc: { en: '+2 Coins', zh: '+2 金幣' },
    tooltip: {
      en: "+2 Coins. Discard the top card of your deck. If it's an Action card, you may play it.",
      zh: '+2 金幣。棄掉你牌庫頂的牌；若它是行動牌，你可以打出它。',
    },
  },
  Village: {
    name: { en: 'Village', zh: '村莊' },
    type: 'action',
    cost: 3,
    desc: { en: '+1 Card, +2 Actions', zh: '+1 張牌、+2 行動' },
    tooltip: { en: '+1 Card, +2 Actions.', zh: '+1 張牌、+2 行動。' },
  },
  Workshop: {
    name: { en: 'Workshop', zh: '工作室' },
    type: 'action',
    cost: 3,
    desc: { en: 'Gain a card costing up to 4', zh: '獲得一張費用至多 4 的牌' },
    tooltip: { en: 'Gain a card costing up to 4 coins.', zh: '獲得一張費用至多 4 金幣的牌。' },
  },
  Bureaucrat: {
    name: { en: 'Bureaucrat', zh: '官員' },
    type: 'action',
    subtypes: ['attack'],
    cost: 4,
    desc: { en: 'Gain a Silver onto your deck', zh: '獲得銀幣放到牌庫頂' },
    tooltip: {
      en: 'Gain a Silver onto your deck. Each other player reveals a Victory card from their hand and puts it onto their deck (or reveals a hand with no Victory cards).',
      zh: '獲得一張銀幣放到牌庫頂。其他每位玩家從手牌展示一張勝利牌並放到其牌庫頂（若沒有則展示手牌）。',
    },
  },
  Gardens: {
    name: { en: 'Gardens', zh: '花園' },
    type: 'victory',
    cost: 4,
    tooltip: {
      en: 'Worth 1 victory point per 10 cards you have (round down).',
      zh: '你每擁有 10 張牌，此牌價值 1 分（無條件捨去）。',
    },
  },
  Militia: {
    name: { en: 'Militia', zh: '義勇軍' },
    type: 'action',
    subtypes: ['attack'],
    cost: 4,
    desc: { en: '+2 Coins', zh: '+2 金幣' },
    tooltip: {
      en: '+2 Coins. Each other player discards down to 3 cards in hand.',
      zh: '+2 金幣。其他每位玩家將手牌棄到剩 3 張。',
    },
  },
  Moneylender: {
    name: { en: 'Moneylender', zh: '錢莊' },
    type: 'action',
    cost: 4,
    desc: { en: 'Trash a Copper for +3', zh: '移除銅幣換 +3' },
    tooltip: {
      en: 'You may trash a Copper from your hand for +3 coins.',
      zh: '你可以從手牌移除一張銅幣，獲得 +3 金幣。',
    },
  },
  Poacher: {
    name: { en: 'Poacher', zh: '盜獵者' },
    type: 'action',
    cost: 4,
    desc: { en: '+1 Card, +1 Action, +1 Coin', zh: '+1 張牌、+1 行動、+1 金幣' },
    tooltip: {
      en: '+1 Card, +1 Action, +1 Coin. Discard a card per empty Supply pile.',
      zh: '+1 張牌、+1 行動、+1 金幣。供應區每有一堆空了，就棄一張手牌。',
    },
  },
  Remodel: {
    name: { en: 'Remodel', zh: '重建' },
    type: 'action',
    cost: 4,
    desc: { en: 'Trash & Gain', zh: '移除並獲得' },
    tooltip: {
      en: 'Trash a card from your hand. Gain a card costing up to 2 more than it.',
      zh: '從手牌移除一張牌，獲得一張費用至多比它多 2 的牌。',
    },
  },
  Smithy: {
    name: { en: 'Smithy', zh: '鐵匠' },
    type: 'action',
    cost: 4,
    desc: { en: '+3 Cards', zh: '+3 張牌' },
    tooltip: { en: '+3 Cards.', zh: '+3 張牌。' },
  },
  ThroneRoom: {
    name: { en: 'Throne Room', zh: '王座' },
    type: 'action',
    cost: 4,
    desc: { en: 'Play an Action twice', zh: '打出行動牌兩次' },
    tooltip: {
      en: 'You may play an Action card from your hand twice.',
      zh: '你可以從手牌打出一張行動牌，並執行兩次。',
    },
  },
  Bandit: {
    name: { en: 'Bandit', zh: '強盜' },
    type: 'action',
    subtypes: ['attack'],
    cost: 5,
    desc: { en: 'Gain a Gold', zh: '獲得黃金' },
    tooltip: {
      en: 'Gain a Gold. Each other player reveals the top 2 cards of their deck, trashes a revealed Treasure other than Copper, and discards the rest.',
      zh: '獲得一張黃金。其他每位玩家展示牌庫頂 2 張牌，移除其中一張非銅幣的寶物牌，其餘棄掉。',
    },
  },
  CouncilRoom: {
    name: { en: 'Council Room', zh: '議事廳' },
    type: 'action',
    cost: 5,
    desc: { en: '+4 Cards, +1 Buy', zh: '+4 張牌、+1 購買' },
    tooltip: {
      en: '+4 Cards, +1 Buy. Each other player draws a card.',
      zh: '+4 張牌、+1 購買。其他每位玩家抽 1 張牌。',
    },
  },
  Festival: {
    name: { en: 'Festival', zh: '慶典' },
    type: 'action',
    cost: 5,
    desc: { en: '+2 Actions, +1 Buy, +2 Coins', zh: '+2 行動、+1 購買、+2 金幣' },
    tooltip: { en: '+2 Actions, +1 Buy, +2 Coins.', zh: '+2 行動、+1 購買、+2 金幣。' },
  },
  Laboratory: {
    name: { en: 'Laboratory', zh: '實驗室' },
    type: 'action',
    cost: 5,
    desc: { en: '+2 Cards, +1 Action', zh: '+2 張牌、+1 行動' },
    tooltip: { en: '+2 Cards, +1 Action.', zh: '+2 張牌、+1 行動。' },
  },
  Library: {
    name: { en: 'Library', zh: '圖書館' },
    type: 'action',
    cost: 5,
    desc: { en: 'Draw to 7 cards', zh: '抽到 7 張手牌' },
    tooltip: {
      en: 'Draw until you have 7 cards in hand, skipping any Action cards you choose to; set those aside, discarding them afterwards.',
      zh: '抽牌直到手牌有 7 張；抽到的行動牌可以選擇跳過並放在一旁，結束後棄掉。',
    },
  },
  Market: {
    name: { en: 'Market', zh: '市集' },
    type: 'action',
    cost: 5,
    desc: { en: '+1 Card, +1 Action, +1 Buy, +1 Coin', zh: '+1 張牌、+1 行動、+1 購買、+1 金幣' },
    tooltip: { en: '+1 Card, +1 Action, +1 Buy, +1 Coin.', zh: '+1 張牌、+1 行動、+1 購買、+1 金幣。' },
  },
  Mine: {
    name: { en: 'Mine', zh: '礦坑' },
    type: 'action',
    cost: 5,
    desc: { en: 'Upgrade a Treasure', zh: '升級寶物牌' },
    tooltip: {
      en: 'You may trash a Treasure from your hand. Gain a Treasure to your hand costing up to 3 more than it.',
      zh: '你可以從手牌移除一張寶物牌，獲得一張費用至多比它多 3 的寶物牌到手牌。',
    },
  },
  Sentry: {
    name: { en: 'Sentry', zh: '哨兵' },
    type: 'action',
    cost: 5,
    desc: { en: '+1 Card, +1 Action', zh: '+1 張牌、+1 行動' },
    tooltip: {
      en: '+1 Card, +1 Action. Look at the top 2 cards of your deck. Trash and/or discard any number of them. Put the rest back on top in any order.',
      zh: '+1 張牌、+1 行動。檢視牌庫頂 2 張牌，移除及／或棄掉任意張，其餘以任意順序放回牌庫頂。',
    },
  },
  Witch: {
    name: { en: 'Witch', zh: '女巫' },
    type: 'action',
    subtypes: ['attack'],
    cost: 5,
    desc: { en: '+2 Cards', zh: '+2 張牌' },
    tooltip: {
      en: '+2 Cards. Each other player gains a Curse.',
      zh: '+2 張牌。其他每位玩家獲得一張詛咒。',
    },
  },
  Artisan: {
    name: { en: 'Artisan', zh: '手藝人' },
    type: 'action',
    cost: 6,
    desc: { en: 'Gain a card to hand', zh: '獲得一張牌到手牌' },
    tooltip: {
      en: 'Gain a card to your hand costing up to 5 coins. Put a card from your hand onto your deck.',
      zh: '獲得一張費用至多 5 金幣的牌到手牌，然後將一張手牌放到牌庫頂。',
    },
  },
};

/** The rulebook's recommended 10-card sets (ids match the backend). */
export const KINGDOM_PRESETS: { id: string; name: Text; cards: string[] }[] = [
  {
    id: 'first-game',
    name: { en: 'First Game', zh: '初次遊戲' },
    cards: ['Cellar', 'Market', 'Merchant', 'Militia', 'Mine', 'Moat', 'Remodel', 'Smithy', 'Village', 'Workshop'],
  },
  {
    id: 'size-distortion',
    name: { en: 'Size Distortion', zh: '規模扭曲' },
    cards: ['Artisan', 'Bandit', 'Bureaucrat', 'Chapel', 'Festival', 'Gardens', 'Sentry', 'ThroneRoom', 'Witch', 'Workshop'],
  },
  {
    id: 'deck-top',
    name: { en: 'Deck Top', zh: '牌庫頂' },
    cards: ['Artisan', 'Bureaucrat', 'CouncilRoom', 'Festival', 'Harbinger', 'Laboratory', 'Moneylender', 'Sentry', 'Vassal', 'Village'],
  },
  {
    id: 'sleight-of-hand',
    name: { en: 'Sleight of Hand', zh: '妙手' },
    cards: ['Cellar', 'CouncilRoom', 'Festival', 'Gardens', 'Library', 'Harbinger', 'Militia', 'Poacher', 'Smithy', 'ThroneRoom'],
  },
  {
    id: 'improvements',
    name: { en: 'Improvements', zh: '改良' },
    cards: ['Artisan', 'Cellar', 'Market', 'Merchant', 'Mine', 'Moat', 'Moneylender', 'Poacher', 'Remodel', 'Witch'],
  },
  {
    id: 'silver-and-gold',
    name: { en: 'Silver & Gold', zh: '金銀' },
    cards: ['Bandit', 'Bureaucrat', 'Chapel', 'Harbinger', 'Laboratory', 'Merchant', 'Mine', 'Moneylender', 'ThroneRoom', 'Vassal'],
  },
];

export const BASE_CARDS = ['Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse'];

export function getCardType(cardName: string): CardType | undefined {
  return CARD_DATA[cardName]?.type;
}

export function isTreasure(cardName: string): boolean {
  return getCardType(cardName) === 'treasure';
}

export function isAction(cardName: string): boolean {
  return getCardType(cardName) === 'action';
}

export interface CardFrameStyle {
  /** Banner / label strip color. */
  color: string;
  /** Short type label shown at the bottom of the card. */
  label: Text;
}

const FRAME_STYLES = {
  treasure: { color: '#e7c45c', label: { en: 'Treasure', zh: '錢幣卡' } },
  victory: { color: '#8cc084', label: { en: 'Victory', zh: '分數卡' } },
  curse: { color: '#a27bbd', label: { en: 'Curse', zh: '詛咒卡' } },
  action: { color: '#ece3cf', label: { en: 'Action', zh: '行動卡' } },
  attack: { color: '#ece3cf', label: { en: 'Attack', zh: '攻擊卡' } },
  reaction: { color: '#8fb5df', label: { en: 'Reaction', zh: '反應卡' } },
} satisfies Record<string, CardFrameStyle>;

/** Card frame look shared by the Phaser table and React dialogs. */
export function getCardFrameStyle(cardName: string): CardFrameStyle {
  const data = CARD_DATA[cardName];
  if (!data) return FRAME_STYLES.action;
  if (data.subtypes?.includes('reaction')) return FRAME_STYLES.reaction;
  if (data.subtypes?.includes('attack')) return FRAME_STYLES.attack;
  return FRAME_STYLES[data.type];
}

/** Display order in hand: Actions, Treasures, Victory, Curses; then by cost. */
export function compareForHand(a: string, b: string): number {
  const order: CardType[] = ['action', 'treasure', 'victory', 'curse'];
  const typeDiff = order.indexOf(CARD_DATA[a]?.type ?? 'action') - order.indexOf(CARD_DATA[b]?.type ?? 'action');
  return typeDiff || getCardCost(b) - getCardCost(a) || a.localeCompare(b);
}

export function getCardCost(cardName: string): number {
  return CARD_DATA[cardName]?.cost || 0;
}

/** Sort key used for supply and selection lists: cost, then English name. */
export function compareByCost(a: string, b: string): number {
  return getCardCost(a) - getCardCost(b) || a.localeCompare(b);
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

/** Same scoring as the backend: Gardens is worth 1 per 10 cards owned. */
export function calculateVictoryPoints(cards: string[]): number {
  const gardensValue = Math.floor(cards.length / 10);
  return cards.reduce(
    (total, card) => total + (card === 'Gardens' ? gardensValue : CARD_DATA[card]?.vp ?? 0),
    0,
  );
}

/**
 * Artwork sets generated by tools/card-art (Codex CLI image generation);
 * each lives in /assets/cards/<id>/ with one WebP per card.
 */
export const ART_STYLES = [
  { id: 'cute', name: { en: 'Cute storybook', zh: '可愛繪本' }, pixelated: false },
  { id: 'gouache-picturebook', name: { en: 'Gouache picture book', zh: '膠彩童書' }, pixelated: false },
  { id: 'pixel-art', name: { en: 'Pixel art', zh: '點陣像素' }, pixelated: true },
] as const;

export type ArtStyle = (typeof ART_STYLES)[number]['id'];
export const DEFAULT_ART_STYLE: ArtStyle = 'cute';

export function isArtStyle(value: unknown): value is ArtStyle {
  return ART_STYLES.some((style) => style.id === value);
}

export function isPixelated(style: ArtStyle): boolean {
  return ART_STYLES.find((s) => s.id === style)?.pixelated ?? false;
}

export interface ConfiguredCardArt {
  cardName: string;
  path: string;
  textureKey: string;
}

export function getCardArtPath(cardName: string, style: ArtStyle): string | undefined {
  // BASE_URL is '/' normally and '/dominion/' on GitHub Pages.
  return CARD_DATA[cardName]
    ? `${import.meta.env.BASE_URL}assets/cards/${style}/${cardName.toLowerCase()}.webp`
    : undefined;
}

/** Start-screen backdrop for a style (tools/card-art/generate.py --backdrop). */
export function getBackdropPath(style: ArtStyle, shape: 'wide' | 'tall'): string {
  return `${import.meta.env.BASE_URL}assets/backdrops/${style}-${shape}.webp`;
}

export function getCardTextureKey(cardName: string, style: ArtStyle): string {
  return `card-art-${style}-${cardName.toLowerCase()}`;
}

export function getConfiguredCardArt(style: ArtStyle): ConfiguredCardArt[] {
  return Object.keys(CARD_DATA).map((cardName) => ({
    cardName,
    path: getCardArtPath(cardName, style)!,
    textureKey: getCardTextureKey(cardName, style),
  }));
}
