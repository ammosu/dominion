import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';
import { SupplyCategory } from './SupplyCategory';

export class SupplyArea {
  private scene: Phaser.Scene;
  private categories: SupplyCategory[] = [];
  private leftSidebarX: number = 120; // Left sidebar for basic cards
  private centerX: number = 640; // Center for action cards (half of 1280)
  private topY: number = 80; // Top position to avoid TopBar

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(supply: Record<string, number>, costs: Record<string, number>, lang: 'en' | 'zh' = 'zh') {
    // Clear existing categories
    this.categories.forEach((category) => category.destroy());
    this.categories = [];

    // Organize cards by type
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province', 'Curse'];
    const actions = Object.keys(supply).filter(
      (card) => !treasures.includes(card) && !victory.includes(card)
    );

    // LEFT SIDEBAR: Basic cards (Treasures + Victory) in vertical single column
    const basicCards = [...treasures, ...victory];
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
