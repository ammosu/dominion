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

    const cardWidth = 110;
    const cardHeight = 90;
    // Smaller cards for single-column layout (basic cards)
    const cardScale = cardsPerRow === 1 ? 0.8 : 1.0;
    const effectiveCardWidth = cardWidth * cardScale;
    const effectiveCardHeight = cardHeight * cardScale;

    const spacing = 120; // Horizontal spacing for wider cards
    // Use tighter spacing for single-column vertical layout
    const rowSpacing = cardsPerRow === 1 ? 75 : 100; // Vertical spacing between rows
    const padding = 15; // Padding around the frame
    const labelHeight = 20; // Label text height
    const labelPadding = 8; // Space between label and cards
    const cardTopMargin = cardsPerRow === 1 ? 32 : 40; // Extra space for cost badge
    const cardBottomMargin = cardsPerRow === 1 ? 16 : 20; // Space for count badge

    // Calculate dimensions using effective (scaled) card sizes
    const rows = Math.ceil(cards.length / cardsPerRow);
    const bgWidth = (cardsPerRow - 1) * spacing + effectiveCardWidth + padding * 2;
    // Height: padding + labelHeight + labelPadding + cardTopMargin + cardHeight/2 + (rows-1)*rowSpacing + cardHeight/2 + cardBottomMargin + padding
    const bgHeight = padding + labelHeight + labelPadding + cardTopMargin + effectiveCardHeight / 2 + (rows - 1) * rowSpacing + effectiveCardHeight / 2 + cardBottomMargin + padding;

    // Create background first (centered at 0,0 within this container)
    this.background = scene.add.rectangle(0, 0, bgWidth, bgHeight, bgColor, 0.15);
    this.background.setStrokeStyle(2, bgColor, 0.4);
    this.background.setOrigin(0.5, 0); // Top-center origin
    this.add(this.background);

    // Layout cards (positioned relative to this container)
    // Cards start below label with enough space for cost badge
    const cardsStartY = padding + labelHeight + labelPadding + cardTopMargin;
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
        // Scale down basic cards (single column layout)
        if (cardScale !== 1.0) {
          pile.setScale(cardScale);
          pile.setBaseScale(cardScale); // Store base scale for hover restoration
        }
        this.piles.push(pile);
        this.add(pile);
      }
    });

    // Create label last (so it renders on top of all cards)
    this.label = scene.add.text(-bgWidth / 2 + padding, padding, labelText, {
      fontSize: '14px',
      fontFamily: 'Cinzel, "Noto Sans TC", serif',
      color: '#FFD700', // Bright gold for visibility
      fontStyle: 'bold',
    });
    this.label.setResolution(window.devicePixelRatio || 2);
    this.label.setOrigin(0, 0);
    this.add(this.label);

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
