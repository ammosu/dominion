import Phaser from 'phaser';
import { getCardName } from '../../utils/cardData';
import { CardArtwork } from './CardArtwork';

export class SupplyPile extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardCount: number;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardBorder: Phaser.GameObjects.Rectangle;
  private artwork?: CardArtwork;
  private cardText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Container;
  private originalY: number;
  private baseScale: number = 1.0; // Store the base scale for proper restoration

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, count: number, cost: number, lang: 'en' | 'zh' = 'zh') {
    super(scene, x, y);

    this.cardName = cardName;
    this.cardCount = count;
    this.originalY = y;

    // Card background with type-based color (flatter, more square shape)
    const bgColor = this.getCardBgColor(cardName);
    this.cardBg = scene.add.rectangle(0, 0, 110, 90, bgColor);
    this.cardBg.setStrokeStyle(2, 0x999999);
    this.add(this.cardBg);

    this.artwork = CardArtwork.create(scene, cardName, 110, 90);
    if (this.artwork) {
      this.add(this.artwork);
    }

    this.cardBorder = scene.add.rectangle(0, 0, 110, 90, 0x000000, 0);
    this.cardBorder.setStrokeStyle(2, 0x999999);
    this.add(this.cardBorder);

    // Card name (use provided language)
    const displayName = getCardName(cardName, lang);
    this.cardText = scene.add.text(0, this.artwork ? -31 : 0, displayName, {
      fontSize: '12px',
      color: this.artwork ? '#fff1d2' : '#000000',
      wordWrap: { width: 95 },
      align: 'center',
      resolution: window.devicePixelRatio || 2,
      fontStyle: 'bold',
    });
    this.cardText.setOrigin(0.5);
    if (this.artwork) {
      this.cardText.setShadow(0, 2, '#000000', 4, true, true);
    }
    this.add(this.cardText);

    // Count badge (bottom center)
    const countBg = scene.add.circle(0, 32, 15, 0x333333, 0.9);
    this.countText = scene.add.text(0, 32, count.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: window.devicePixelRatio || 2,
      fontFamily: '"Cormorant Garamond", serif',
    });
    this.countText.setOrigin(0.5);
    this.add(countBg);
    this.add(this.countText);

    // Cost badge (top-left corner)
    const costBg = scene.add.circle(-43, -35, 13, 0xFFD700, 1);
    costBg.setStrokeStyle(1, 0x000000, 0.3);
    const costText = scene.add.text(-43, -35, cost.toString(), {
      fontSize: '13px',
      color: '#000000',
      fontStyle: 'bold',
      resolution: window.devicePixelRatio || 2,
      fontFamily: '"Cormorant Garamond", serif',
    });
    costText.setOrigin(0.5);
    this.costBadge = scene.add.container(0, 0, [costBg, costText]);
    this.add(this.costBadge);

    scene.add.existing(this);

    // Interactive
    this.setSize(110, 90);
    this.setInteractive({ useHandCursor: true });

    // Hover effect
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerOver() {
    this.artwork?.setHovered(true);
    this.scene.tweens.add({
      targets: this,
      scale: 1.15, // All cards scale to same size on hover for clarity
      y: this.originalY - 10,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    // Highlight the card
    this.cardBorder.setStrokeStyle(3, 0xFFD700);
    this.scene.events.emit('supply-card-hovered', this.cardName);
  }

  private onPointerOut() {
    this.artwork?.setHovered(false);
    this.scene.tweens.add({
      targets: this,
      scale: this.baseScale, // Restore to base scale
      y: this.originalY,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    // Remove highlight
    this.cardBorder.setStrokeStyle(2, 0x999999);
    this.scene.events.emit('supply-card-hovered', null);
  }

  private onPointerDown() {
    this.scene.events.emit('supply-card-clicked', this.cardName);
  }

  updateCount(count: number) {
    this.cardCount = count;
    this.countText.setText(count.toString());

    // Gray out if empty
    if (count === 0) {
      this.cardBg.setFillStyle(0x888888);
      this.setAlpha(0.5);
      this.disableInteractive();
    }
  }

  getCardName(): string {
    return this.cardName;
  }

  getCount(): number {
    return this.cardCount;
  }

  updateLanguage(lang: 'en' | 'zh') {
    const translatedName = getCardName(this.cardName, lang);
    this.cardText.setText(translatedName);
  }

  setBaseScale(scale: number) {
    this.baseScale = scale;
  }

  private getCardBgColor(cardName: string): number {
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province'];
    if (treasures.includes(cardName)) return 0xfff8dc;
    if (victory.includes(cardName)) return 0xe8f5e9;
    if (cardName === 'Curse') return 0xf3e5f5;
    return 0xffffff;
  }
}
