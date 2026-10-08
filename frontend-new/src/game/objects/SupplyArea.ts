import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';
import { SupplyCategory } from './SupplyCategory';
import { BASE_CARDS, compareByCost } from '../../utils/cardData';

export class SupplyArea {
  private scene: Phaser.Scene;
  private categories: SupplyCategory[] = [];
  private leftSidebarX: number = 120; // Left sidebar for basic cards
  private centerX: number = 640; // Center for action cards (half of 1280)
  private topY: number = 80; // Top position to avoid TopBar

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(
    supply: Record<string, number>,
    costs: Record<string, number>,
    lang: 'en' | 'zh' = 'zh',
    kingdom: string[] = [],
  ) {
    // Clear existing categories
    this.categories.forEach((category) => category.destroy());
    this.categories = [];

    // Kingdom piles in the server's order (by cost); fall back to sorting ourselves.
    const actions = (kingdom.length > 0 ? kingdom : Object.keys(supply))
      .filter((card) => !BASE_CARDS.includes(card) && supply[card] !== undefined)
      .sort(compareByCost);

    // LEFT SIDEBAR: Basic cards (Treasures + Victory) in vertical single column
    const basicCards = BASE_CARDS;
    const basicLabel = lang === 'zh' ? '基本牌' : 'BASIC CARDS';
    const basicCategory = new SupplyCategory(
      this.scene,
      this.leftSidebarX,
      this.topY,
      basicCards,
      supply,
      costs,
      1, // 1 card per row (vertical stack)
      basicLabel,
      'treasures', // Use treasures type for coloring
      0xfff8dc, // Cream color
      lang
    );
    this.categories.push(basicCategory);

    // CENTER: Action cards in horizontal rows
    if (actions.length > 0) {
      const actionsLabel = lang === 'zh' ? '王國牌' : 'KINGDOM CARDS';
      const actionsCategory = new SupplyCategory(
        this.scene,
        this.centerX,
        this.topY,
        actions,
        supply,
        costs,
        5, // 5 cards per row (horizontal layout)
        actionsLabel,
        'actions',
        0xffffff, // White
        lang
      );
      this.categories.push(actionsCategory);
    }
  }

  updateSupply(supply: Record<string, number>) {
    this.categories.forEach((category) => {
      category.updateSupply(supply);
    });
  }

  hasSameCards(cardNames: string[]): boolean {
    const current = this.categories.flatMap((category) => category.getPiles().map((p) => p.getCardName()));
    return current.length === cardNames.length && cardNames.every((name) => current.includes(name));
  }

  getPile(cardName: string): SupplyPile | undefined {
    for (const category of this.categories) {
      const pile = category.getPiles().find((p) => p.getCardName() === cardName);
      if (pile) return pile;
    }
    return undefined;
  }

  clear() {
    this.categories.forEach((category) => category.destroy());
    this.categories = [];
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.categories.forEach((category) => {
      category.updateLanguage(lang);
    });
  }
}
