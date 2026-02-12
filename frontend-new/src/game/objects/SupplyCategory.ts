import Phaser from 'phaser';
import { SupplyPile } from './SupplyPile';

export class SupplyCategory extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private piles: SupplyPile[] = [];
  private labelType: 'treasures' | 'victory' | 'actions';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cards: string[],
    supply: Record<string, number>,
    costs: Record<string, number>,
    cardsPerRow: number,
    labelText: string,
    labelType: 'treasures' | 'victory' | 'actions',
    bgColor: number,
    lang: 'en' | 'zh' = 'zh'
  ) {
    super(scene, x, y);

    this.labelType = labelType;

    const cardWidth = 85;
    const cardHeight = 115;
    const spacing = 95;
    const rowSpacing = 125;
    const padding = 20;
    const labelHeight = 30;
    const labelPadding = 8;

    // Calculate dimensions
    const rows = Math.ceil(cards.length / cardsPerRow);
    const bgWidth = (cardsPerRow - 1) * spacing + cardWidth + padding * 2;
    // Height: labelHeight + labelPadding + first row cardHeight + additional rows spacing + bottom padding
    const bgHeight = labelHeight + labelPadding + cardHeight + (rows - 1) * rowSpacing + padding;

    // Create background first (centered at 0,0 within this container)
    this.background = scene.add.rectangle(0, 0, bgWidth, bgHeight, bgColor, 0.15);
    this.background.setStrokeStyle(2, bgColor, 0.4);
    this.background.setOrigin(0.5, 0); // Top-center origin
    this.add(this.background);

    // Create label after background (so it renders on top)
    this.label = scene.add.text(-bgWidth / 2 + padding, 8, labelText, {
      fontSize: '15px',
      fontFamily: 'Cinzel, "Noto Sans TC", serif',
      color: '#FFD700', // Bright gold for visibility
      fontStyle: 'bold',
    });
    this.label.setResolution(window.devicePixelRatio || 2);
    this.label.setOrigin(0, 0);
    this.add(this.label);

    // Layout cards (positioned relative to this container)
    const cardsStartY = labelHeight + labelPadding;
    const firstCardX = -(cardsPerRow - 1) * spacing / 2; // Center the row of cards

    cards.forEach((cardName, index) => {
      if (supply[cardName] !== undefined) {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        const cardX = firstCardX + col * spacing;
        const cardY = cardsStartY + row * rowSpacing;

        const pile = new SupplyPile(
          scene,
          cardX,
          cardY,
          cardName,
          supply[cardName],
          costs[cardName] || 0,
          lang
        );
        pile.setDepth(10); // Ensure cards are above background
        this.piles.push(pile);
        this.add(pile);
      }
    });

    scene.add.existing(this);
  }

  updateSupply(supply: Record<string, number>) {
    this.piles.forEach((pile) => {
      const cardName = pile.getCardName();
      if (supply[cardName] !== undefined) {
        pile.updateCount(supply[cardName]);
      }
    });
  }

  updateLanguage(lang: 'en' | 'zh') {
    // Update card names
    this.piles.forEach((pile) => {
      pile.updateLanguage(lang);
    });

    // Update label text
    let text = '';
    if (this.labelType === 'treasures') {
      text = lang === 'zh' ? '寶物牌' : 'TREASURES';
    } else if (this.labelType === 'victory') {
      text = lang === 'zh' ? '勝利 / 詛咒' : 'VICTORY / CURSE';
    } else if (this.labelType === 'actions') {
      text = lang === 'zh' ? '行動牌' : 'ACTIONS';
    }
    this.label.setText(text);
  }

  getPiles(): SupplyPile[] {
    return this.piles;
  }
}
