import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';

export class SupplyArea {
  private scene: Phaser.Scene;
  private piles: Map<string, SupplyPile> = new Map();
  private categoryLabels: Phaser.GameObjects.Text[] = [];
  private baseX: number = 80;
  private baseY: number = 100;
  private cardWidth: number = 85;
  private cardHeight: number = 115;
  private spacing: number = 95;
  private rowSpacing: number = 130;
  private categorySpacing: number = 50; // Extra space between categories

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(supply: Record<string, number>, costs: Record<string, number>, lang: 'en' | 'zh' = 'zh') {
    // Clear existing piles and labels
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();
    this.categoryLabels.forEach((label) => label.destroy());
    this.categoryLabels = [];

    // Organize cards by type
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province', 'Curse'];
    const actions = Object.keys(supply).filter(
      (card) => !treasures.includes(card) && !victory.includes(card)
    );

    let currentY = this.baseY;

    // Helper function to create category label
    const createCategoryLabel = (text: string, y: number) => {
      const label = this.scene.add.text(this.baseX, y - 35, text, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFD700',
        fontStyle: 'bold',
      });
      label.setResolution(window.devicePixelRatio || 2);
      label.setDepth(1000); // Ensure labels are on top
      this.categoryLabels.push(label);
      return label;
    };

    // Helper function to layout cards in a row
    const layoutCards = (cards: string[], startY: number, cardsPerRow: number = 7) => {
      let maxY = startY;
      cards.forEach((cardName, index) => {
        if (supply[cardName] !== undefined) {
          const row = Math.floor(index / cardsPerRow);
          const col = index % cardsPerRow;
          const x = this.baseX + col * this.spacing;
          const y = startY + row * this.rowSpacing;

          const pile = new SupplyPile(
            this.scene,
            x,
            y,
            cardName,
            supply[cardName],
            costs[cardName] || 0,
            lang
          );
          this.piles.set(cardName, pile);
          maxY = Math.max(maxY, y);
        }
      });
      return maxY;
    };

    // Layout Treasures
    createCategoryLabel(lang === 'zh' ? '--- 寶物牌 ---' : '--- TREASURES ---', currentY);
    currentY = layoutCards(treasures, currentY, 3) + this.rowSpacing + this.categorySpacing;

    // Layout Victory & Curse
    createCategoryLabel(lang === 'zh' ? '--- 勝利 / 詛咒 ---' : '--- VICTORY / CURSE ---', currentY);
    currentY = layoutCards(victory, currentY, 4) + this.rowSpacing + this.categorySpacing;

    // Layout Actions
    if (actions.length > 0) {
      createCategoryLabel(lang === 'zh' ? '--- 行動牌 ---' : '--- ACTIONS ---', currentY);
      layoutCards(actions, currentY, 5);
    }
  }

  updateSupply(supply: Record<string, number>) {
    this.piles.forEach((pile, cardName) => {
      if (supply[cardName] !== undefined) {
        pile.updateCount(supply[cardName]);
      }
    });
  }

  getPile(cardName: string): SupplyPile | undefined {
    return this.piles.get(cardName);
  }

  clear() {
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();
    this.categoryLabels.forEach((label) => label.destroy());
    this.categoryLabels = [];
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.piles.forEach((pile) => {
      pile.updateLanguage(lang);
    });

    // Recreate labels with new language
    // (Note: In a real implementation, we'd store category info and just update text)
  }
}
