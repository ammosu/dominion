import Phaser from 'phaser';
import { Card } from './Card';

export class Hand {
  private scene: Phaser.Scene;
  private cards: Card[] = [];
  private baseY: number = 680; // Move closer to bottom for better feel
  private spacing: number = 100;
  private arcHeight: number = 40; // More pronounced arc
  private maxRotation: number = 20; // Stronger fan rotation

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addCard(card: Card) {
    this.cards.push(card);
    this.arrangeCards();
  }

  /** Add card without triggering arrange (for batch updates) */
  addCardSilent(card: Card) {
    this.cards.push(card);
  }

  removeCard(card: Card) {
    const index = this.cards.indexOf(card);
    if (index !== -1) {
      this.cards.splice(index, 1);
      this.arrangeCards();
    }
  }

  arrangeCards(animate: boolean = true) {
    const count = this.cards.length;
    if (count === 0) return;

    this.cards.forEach((card, i) => {
      // 計算扇形排列
      const t = count > 1 ? i / (count - 1) : 0.5;
      const angle = (t - 0.5) * 2 * this.maxRotation;
      const angleRad = Phaser.Math.DegToRad(angle);

      const x = this.scene.cameras.main.width / 2 + (i - count / 2 + 0.5) * this.spacing;
      const y = this.baseY + Math.abs(angle) * this.arcHeight / this.maxRotation;

      // Always update the card's base position and rotation so it knows where to return
      card.setBasePosition(x, y);
      card.setBaseRotation(angleRad);

      if (animate) {
        // 動畫移動到新位置
        this.scene.tweens.add({
          targets: card,
          x: x,
          y: y,
          rotation: angleRad,
          duration: 300,
          ease: 'Cubic.easeOut',
        });
      } else {
        // 直接設定位置（無動畫）
        card.setPosition(x, y);
        card.setRotation(angleRad);
      }

      // 設定深度（中間的卡片在上面）
      card.setDepth(10 + Math.abs(i - count / 2));
    });
  }

  getCards(): Card[] {
    return this.cards;
  }

  clear() {
    this.cards.forEach((card) => card.destroy());
    this.cards = [];
  }
}
