import Phaser from 'phaser';
import { getCardName } from '../../utils/cardData';

export class SupplyPile extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardCount: number;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Container;
  private originalY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, count: number, cost: number, lang: 'en' | 'zh' = 'zh') {
    super(scene, x, y);

    this.cardName = cardName;
    this.cardCount = count;
    this.originalY = y;

    // Card background with type-based color
    const bgColor = this.getCardBgColor(cardName);
    this.cardBg = scene.add.rectangle(0, 0, 85, 115, bgColor);
    this.cardBg.setStrokeStyle(2, 0x999999);
    this.add(this.cardBg);

    // Card name (use provided language)
    const displayName = getCardName(cardName, lang);
    this.cardText = scene.add.text(0, -5, displayName, {
      fontSize: '13px',
      color: '#000000',
      wordWrap: { width: 75 },
      align: 'center',
      resolution: window.devicePixelRatio || 2,
      fontStyle: 'bold',
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    // Count badge (larger and more visible)
    const countBg = scene.add.circle(0, 38, 17, 0x333333, 0.9);
    this.countText = scene.add.text(0, 38, count.toString(), {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      resolution: window.devicePixelRatio || 2,
      fontFamily: '"Cormorant Garamond", serif',
    });
    this.countText.setOrigin(0.5);
    this.add(countBg);
    this.add(this.countText);

    // Cost badge (larger and positioned at top-left for clarity)
    const costBg = scene.add.circle(-32, -48, 14, 0xFFD700, 1);
    costBg.setStrokeStyle(1, 0x000000, 0.3);
    const costText = scene.add.text(-32, -48, cost.toString(), {
      fontSize: '14px',
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
    this.setSize(85, 115);
    this.setInteractive({ useHandCursor: true });

    // Hover effect
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerOver() {
    this.scene.tweens.add({
      targets: this,
      scale: 1.15,
      y: this.originalY - 10,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    // Highlight the card
    this.cardBg.setStrokeStyle(3, 0xFFD700);
    this.scene.events.emit('supply-card-hovered', this.cardName);
  }

  private onPointerOut() {
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      y: this.originalY,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    // Remove highlight
    this.cardBg.setStrokeStyle(1, 0x999999);
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

  private getCardBgColor(cardName: string): number {
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province'];
    if (treasures.includes(cardName)) return 0xfff8dc;
    if (victory.includes(cardName)) return 0xe8f5e9;
    if (cardName === 'Curse') return 0xf3e5f5;
    return 0xffffff;
  }
}
