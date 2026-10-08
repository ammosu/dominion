import Phaser from 'phaser';
import { CardFace } from './CardFace';
import { bindCardPointer } from './pointerBinding';

const PLAYABLE_COLOR = 0xffd27a;

/** One group of identical cards in hand, with a count badge. Click plays one. */
export class Card extends Phaser.GameObjects.Container {
  private readonly face: CardFace;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, count: number, width: number, height: number, lang: 'en' | 'zh') {
    super(scene, x, y);
    this.baseY = y;
    this.face = new CardFace(scene, cardName, width, height, lang);
    this.face.setCount(count);
    this.add(this.face);
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    bindCardPointer(this, () => this.scene.events.emit('card-clicked', cardName), (on) => this.hover(on));
    scene.add.existing(this);
  }

  getCardName(): string {
    return this.face.cardName;
  }

  setPlayable(playable: boolean) {
    this.face.setHighlight(playable ? PLAYABLE_COLOR : null);
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.face.setLanguage(lang);
  }

  private hover(on: boolean) {
    this.face.setHovered(on);
    this.scene.tweens.add({
      targets: this,
      y: on ? this.baseY - 14 : this.baseY,
      scale: on ? 1.06 : 1,
      duration: 140,
      ease: 'Cubic.easeOut',
    });
    this.setDepth(on ? 50 : 10);
    this.scene.events.emit('card-hovered', on ? this.face.cardName : null);
  }
}
