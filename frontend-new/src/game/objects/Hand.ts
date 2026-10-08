import Phaser from 'phaser';
import { Card } from './Card';
import { compareForHand } from '../../utils/cardData';
import { handPositions, type TableLayout } from '../tableLayout';

/** The viewer's hand, grouped by card name (one card per name with a count). */
export class Hand {
  private readonly scene: Phaser.Scene;
  private cards: Card[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  build(layout: TableLayout, handCards: string[], lang: 'en' | 'zh') {
    this.clear();
    const counts = new Map<string, number>();
    handCards.forEach((card) => counts.set(card, (counts.get(card) ?? 0) + 1));
    const names = [...counts.keys()].sort(compareForHand);

    const { hand } = layout;
    const y = hand.y + hand.cardHeight / 2;
    handPositions(hand, names.length).forEach((x, i) => {
      const card = new Card(this.scene, x, y, names[i], counts.get(names[i])!, hand.cardWidth, hand.cardHeight, lang);
      card.setDepth(10);
      this.cards.push(card);
    });
  }

  setPlayable(playable: ReadonlySet<string>) {
    this.cards.forEach((card) => card.setPlayable(playable.has(card.getCardName())));
  }

  getCards(): Card[] {
    return this.cards;
  }

  clear() {
    this.cards.forEach((card) => card.destroy());
    this.cards = [];
  }
}
