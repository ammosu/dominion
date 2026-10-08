import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';
import { BASE_ORDER, pileCenter, type PileGrid, type TableLayout } from '../tableLayout';

export class SupplyArea {
  private readonly scene: Phaser.Scene;
  private piles: SupplyPile[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Rebuilds every pile for the given layout. */
  build(layout: TableLayout, supply: Record<string, number>, kingdom: string[], lang: 'en' | 'zh') {
    this.clear();
    const place = (cards: string[], grid: PileGrid) => {
      cards
        .filter((card) => supply[card] !== undefined)
        .forEach((card, index) => {
          const { x, y } = pileCenter(grid, index);
          this.piles.push(
            new SupplyPile(this.scene, x, y, card, grid.pileWidth, grid.pileHeight, supply[card], lang),
          );
        });
    };
    place(BASE_ORDER, layout.base);
    place(kingdom, layout.kingdom);
  }

  updateCounts(supply: Record<string, number>) {
    this.piles.forEach((pile) => {
      const count = supply[pile.getCardName()];
      if (count !== undefined) pile.updateCount(count);
    });
  }

  setBuyable(buyable: ReadonlySet<string>) {
    this.piles.forEach((pile) => pile.setBuyable(buyable.has(pile.getCardName())));
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.piles.forEach((pile) => pile.updateLanguage(lang));
  }

  clear() {
    this.piles.forEach((pile) => pile.destroy());
    this.piles = [];
  }
}
