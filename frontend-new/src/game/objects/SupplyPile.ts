import Phaser from 'phaser';
import { CardFace } from './CardFace';
import { bindCardPointer } from './pointerBinding';

const BUYABLE_COLOR = 0x6fd07f;

/** A clickable Supply pile. Position is the pile's center. */
export class SupplyPile extends Phaser.GameObjects.Container {
  private readonly face: CardFace;
  private readonly baseY: number;
  private pileCount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, width: number, height: number, count: number, lang: 'en' | 'zh') {
    super(scene, x, y);
    this.baseY = y;
    this.face = new CardFace(scene, cardName, width, height, lang);
    this.add(this.face);
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    bindCardPointer(this, (touch) => this.scene.events.emit('supply-card-clicked', cardName, touch), (on) => this.hover(on));
    this.updateCount(count);
    scene.add.existing(this);
  }

  getCardName(): string {
    return this.face.cardName;
  }

  updateCount(count: number) {
    this.pileCount = count;
    this.face.setCount(count);
    this.setAlpha(count === 0 ? 0.4 : 1);
  }

  setBuyable(buyable: boolean) {
    this.face.setHighlight(buyable && this.pileCount > 0 ? BUYABLE_COLOR : null);
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.face.setLanguage(lang);
  }

  private hover(on: boolean) {
    this.face.setHovered(on);
    this.scene.tweens.add({
      targets: this,
      y: on ? this.baseY - 4 : this.baseY,
      scale: on ? 1.04 : 1,
      duration: 120,
      ease: 'Cubic.easeOut',
    });
    this.setDepth(on ? 20 : 0);
    this.scene.events.emit('supply-card-hovered', on ? this.face.cardName : null);
  }
}
