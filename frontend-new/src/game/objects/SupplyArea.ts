import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';

export class SupplyArea {
  private scene: Phaser.Scene;
  private piles: Map<string, SupplyPile> = new Map();
  private categoryLabels: Phaser.GameObjects.Text[] = [];
  private categoryBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private baseX: number = 80;
  private baseY: number = 75; // Adjusted to avoid TopBar
  private cardWidth: number = 85;
  private cardHeight: number = 115;
  private spacing: number = 95;
  private rowSpacing: number = 125; // Reduced for tighter layout
  private categorySpacing: number = 20; // Reduced since backgrounds provide separation

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(supply: Record<string, number>, costs: Record<string, number>, lang: 'en' | 'zh' = 'zh') {
    // Clear existing piles, labels, and backgrounds
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();
    this.categoryLabels.forEach((label) => label.destroy());
    this.categoryLabels = [];
    this.categoryBackgrounds.forEach((bg) => bg.destroy());
    this.categoryBackgrounds = [];

    // Organize cards by type
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province', 'Curse'];
    const actions = Object.keys(supply).filter(
      (card) => !treasures.includes(card) && !victory.includes(card)
    );

    let currentY = this.baseY;

    // Helper function to create category background
    const createCategoryBackground = (
      x: number,
      y: number,
      width: number,
      height: number,
      color: number
    ) => {
      const bg = this.scene.add.rectangle(x, y, width, height, color, 0.15);
      bg.setStrokeStyle(2, color, 0.4);
      bg.setDepth(0); // Behind everything
      this.categoryBackgrounds.push(bg);
      return bg;
    };

    // Helper function to create category label
    const createCategoryLabel = (text: string, x: number, y: number) => {
      const label = this.scene.add.text(x, y, text, {
        fontSize: '14px',
        fontFamily: 'Cinzel, "Noto Sans TC", serif',
        color: '#c4a462',
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

    const padding = 20;
    const labelHeight = 30;
    const labelPadding = 8;

    // Layout Treasures
    const treasureStartY = currentY + labelHeight + labelPadding;
    const treasureRows = 1;
    const treasureBgWidth = 3 * this.spacing + padding * 2;
    const treasureBgHeight = labelHeight + treasureRows * this.cardHeight + padding + labelPadding;

    // Create background first
    createCategoryBackground(
      this.baseX + treasureBgWidth / 2 - padding,
      currentY + treasureBgHeight / 2,
      treasureBgWidth,
      treasureBgHeight,
      0xfff8dc // Cream color for treasures
    );

    // Create label on top of background
    createCategoryLabel(
      lang === 'zh' ? '寶物牌' : 'TREASURES',
      this.baseX,
      currentY + 8
    );

    const treasureMaxY = layoutCards(treasures, treasureStartY, 3);
    currentY = currentY + treasureBgHeight + this.categorySpacing;

    // Layout Victory & Curse
    const victoryStartY = currentY + labelHeight + labelPadding;
    const victoryRows = 1;
    const victoryBgWidth = 4 * this.spacing + padding * 2;
    const victoryBgHeight = labelHeight + victoryRows * this.cardHeight + padding + labelPadding;

    // Create background first
    createCategoryBackground(
      this.baseX + victoryBgWidth / 2 - padding,
      currentY + victoryBgHeight / 2,
      victoryBgWidth,
      victoryBgHeight,
      0xe8f5e9 // Light green for victory
    );

    // Create label on top of background
    createCategoryLabel(
      lang === 'zh' ? '勝利 / 詛咒' : 'VICTORY / CURSE',
      this.baseX,
      currentY + 8
    );

    const victoryMaxY = layoutCards(victory, victoryStartY, 4);
    currentY = currentY + victoryBgHeight + this.categorySpacing;

    // Layout Actions
    if (actions.length > 0) {
      const actionStartY = currentY + labelHeight + labelPadding;
      const actionRows = Math.ceil(actions.length / 5);
      const actionBgWidth = 5 * this.spacing + padding * 2;
      const actionBgHeight = labelHeight + actionRows * this.rowSpacing + padding + labelPadding;

      // Create background first
      createCategoryBackground(
        this.baseX + actionBgWidth / 2 - padding,
        currentY + actionBgHeight / 2,
        actionBgWidth,
        actionBgHeight,
        0xffffff // White for actions
      );

      // Create label on top of background
      createCategoryLabel(
        lang === 'zh' ? '行動牌' : 'ACTIONS',
        this.baseX,
        currentY + 8
      );

      layoutCards(actions, actionStartY, 5);
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
    this.categoryBackgrounds.forEach((bg) => bg.destroy());
    this.categoryBackgrounds = [];
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.piles.forEach((pile) => {
      pile.updateLanguage(lang);
    });

    // Recreate labels with new language
    // (Note: In a real implementation, we'd store category info and just update text)
  }
}
