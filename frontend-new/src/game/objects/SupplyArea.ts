import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';

export class SupplyArea {
  private scene: Phaser.Scene;
  private piles: Map<string, SupplyPile> = new Map();
  private baseX: number = 100;
  private baseY: number = 150;
  private spacing: number = 90;
  private rowSpacing: number = 120;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setupSupply(supply: Record<string, number>, costs: Record<string, number>) {
    // Clear existing piles
    this.piles.forEach((pile) => pile.destroy());
    this.piles.clear();

    // Organize cards by type
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province'];
    const curse = ['Curse'];
    const actions = Object.keys(supply).filter(
      (card) => !treasures.includes(card) && !victory.includes(card) && !curse.includes(card)
    );

    // Layout
    const allCards = [
      ...treasures,
      ...victory,
      curse[0],
      ...actions,
    ];

    allCards.forEach((cardName, index) => {
      if (supply[cardName] !== undefined) {
        const row = Math.floor(index / 7);
        const col = index % 7;
        const x = this.baseX + col * this.spacing;
        const y = this.baseY + row * this.rowSpacing;

        const pile = new SupplyPile(
          this.scene,
          x,
          y,
          cardName,
          supply[cardName],
          costs[cardName] || 0
        );
        this.piles.set(cardName, pile);
      }
    });
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
  }
}
