import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';
import { SupplyCategory } from './SupplyCategory';

export class SupplyArea {
  private scene: Phaser.Scene;
  private categories: SupplyCategory[] = [];
  private baseX: number = 270; // Center position for categories
  private baseY: number = 75; // Adjusted to avoid TopBar
  private categorySpacing: number = 20; // Space between categories

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

    let currentY = this.baseY;

    // Create Treasures category
    const treasuresLabel = lang === 'zh' ? '寶物牌' : 'TREASURES';
    const treasuresCategory = new SupplyCategory(
      this.scene,
      this.baseX,
      currentY,
      treasures,
      supply,
      costs,
      3, // cards per row
      treasuresLabel,
      'treasures',
      0xfff8dc, // Cream color
      lang
    );
    this.categories.push(treasuresCategory);
    currentY += treasuresCategory.getBounds().height + this.categorySpacing;

    // Create Victory & Curse category
    const victoryLabel = lang === 'zh' ? '勝利 / 詛咒' : 'VICTORY / CURSE';
    const victoryCategory = new SupplyCategory(
      this.scene,
      this.baseX,
      currentY,
      victory,
      supply,
      costs,
      4, // cards per row
      victoryLabel,
      'victory',
      0xe8f5e9, // Light green
      lang
    );
    this.categories.push(victoryCategory);
    currentY += victoryCategory.getBounds().height + this.categorySpacing;

    // Create Actions category
    if (actions.length > 0) {
      const actionsLabel = lang === 'zh' ? '行動牌' : 'ACTIONS';
      const actionsCategory = new SupplyCategory(
        this.scene,
        this.baseX,
        currentY,
        actions,
        supply,
        costs,
        5, // cards per row
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
