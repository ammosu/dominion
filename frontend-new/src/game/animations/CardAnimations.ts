import Phaser from 'phaser';
import { Card } from '../objects/Card';

export class CardAnimations {
  static animateDrawCard(
    scene: Phaser.Scene,
    cardName: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): Card {
    const card = new Card(scene, fromX, fromY, cardName);
    card.setScale(0.5);
    card.setAlpha(0.7);

    scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    return card;
  }

  static animateBuyCard(
    scene: Phaser.Scene,
    cardName: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    const tempCard = new Card(scene, fromX, fromY, cardName);

    scene.tweens.add({
      targets: tempCard,
      x: toX,
      y: toY,
      scale: 0.8,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        tempCard.destroy();
        if (onComplete) onComplete();
      },
    });
  }

  static animatePlayCard(
    card: Card,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    card.scene.tweens.add({
      targets: card,
      x: toX,
      y: toY,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Fade out after a moment
        card.scene.time.delayedCall(800, () => {
          card.scene.tweens.add({
            targets: card,
            alpha: 0,
            scale: 0.8,
            duration: 300,
            onComplete: () => {
              if (onComplete) onComplete();
            },
          });
        });
      },
    });
  }
}
