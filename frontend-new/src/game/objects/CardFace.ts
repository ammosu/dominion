import Phaser from 'phaser';
import { getCardCost, getCardFrameStyle, getCardName } from '../../utils/cardData';
import { CardArtwork } from './CardArtwork';

type Lang = 'en' | 'zh';

const hex = (color: string) => Phaser.Display.Color.HexStringToColor(color).color;
const resolution = () => window.devicePixelRatio || 2;

/**
 * A card drawn at any size: name banner, artwork, type label strip, cost
 * coin (bottom-left) and an optional count badge (top-left). Used for both
 * supply piles and hand cards; origin is the card's center.
 */
export class CardFace extends Phaser.GameObjects.Container {
  readonly cardName: string;
  readonly cardWidth: number;
  readonly cardHeight: number;
  private readonly artwork?: CardArtwork;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly countBadge: Phaser.GameObjects.Container;
  private readonly countText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, cardName: string, width: number, height: number, lang: Lang) {
    super(scene, 0, 0);
    this.cardName = cardName;
    this.cardWidth = width;
    this.cardHeight = height;

    const style = getCardFrameStyle(cardName);
    const frameColor = hex(style.color);
    const left = -width / 2;
    const top = -height / 2;
    const inset = 3;
    const bannerHeight = Math.max(16, Math.round(height * 0.15));
    const labelHeight = Math.max(12, Math.round(height * 0.11));
    const artTop = top + inset + bannerHeight;
    const artHeight = height - 2 * inset - bannerHeight - labelHeight;

    const frame = scene.add.graphics();
    frame.fillStyle(0x1a1410, 1);
    frame.fillRoundedRect(left, top, width, height, 6);
    frame.fillStyle(frameColor, 1);
    frame.fillRect(left + inset, top + inset, width - 2 * inset, bannerHeight);
    frame.fillRect(left + inset, top + height - inset - labelHeight, width - 2 * inset, labelHeight);
    this.add(frame);

    this.artwork = CardArtwork.create(scene, cardName, width - 2 * inset, artHeight, false);
    if (this.artwork) {
      this.artwork.setPosition(0, artTop + artHeight / 2);
      this.add(this.artwork);
    }

    this.nameText = scene.add
      .text(0, top + inset + bannerHeight / 2, getCardName(cardName, lang), {
        fontFamily: '"Noto Sans TC", sans-serif',
        fontSize: `${Math.round(bannerHeight * 0.62)}px`,
        fontStyle: 'bold',
        color: '#2a1d10',
      })
      .setOrigin(0.5)
      .setResolution(resolution());
    this.fitText(this.nameText, width - 2 * inset - 4);
    this.add(this.nameText);

    const labelSize = Math.round(labelHeight * 0.7);
    this.labelText = scene.add
      .text(left + width - inset - 4, top + height - inset - labelHeight / 2, style.label[lang], {
        fontFamily: '"Noto Sans TC", sans-serif',
        fontSize: `${labelSize}px`,
        color: '#2a1d10',
      })
      .setOrigin(1, 0.5)
      .setResolution(resolution());
    this.add(this.labelText);

    // Cost coin, bottom-left.
    const coinRadius = Math.max(9, Math.round(height * 0.085));
    const coinX = left + coinRadius + 2;
    const coinY = top + height - coinRadius - 2;
    const coin = scene.add.graphics();
    coin.fillStyle(0xf2c94c, 1);
    coin.lineStyle(2, 0x6b4e16, 1);
    coin.fillCircle(coinX, coinY, coinRadius);
    coin.strokeCircle(coinX, coinY, coinRadius);
    this.add(coin);
    this.add(
      scene.add
        .text(coinX, coinY, String(getCardCost(cardName)), {
          fontFamily: '"Cormorant Garamond", serif',
          fontSize: `${Math.round(coinRadius * 1.35)}px`,
          fontStyle: 'bold',
          color: '#2a1d10',
        })
        .setOrigin(0.5)
        .setResolution(resolution()),
    );

    // Count badge, top-left (hidden until setCount).
    const badgeHeight = Math.round(bannerHeight * 1.05);
    this.countText = scene.add
      .text(0, 0, '', {
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: `${Math.round(badgeHeight * 0.82)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(resolution());
    this.countBadge = scene.add.container(left + 1, top + 1);
    this.countBadge.setData('height', badgeHeight);
    this.countBadge.add([scene.add.graphics(), this.countText]);
    this.countBadge.setVisible(false);
    this.add(this.countBadge);

    this.highlight = scene.add.graphics();
    this.add(this.highlight);

    scene.add.existing(this);
  }

  setCount(count: number | null) {
    if (count === null) {
      this.countBadge.setVisible(false);
      return;
    }
    const height = this.countBadge.getData('height') as number;
    this.countText.setText(String(count));
    const width = Math.max(height, this.countText.width + 8);
    const bg = this.countBadge.getAt(0) as Phaser.GameObjects.Graphics;
    bg.clear();
    bg.fillStyle(0xc0392b, 1);
    bg.lineStyle(1, 0xffffff, 0.8);
    bg.fillRoundedRect(0, 0, width, height, 4);
    bg.strokeRoundedRect(0, 0, width, height, 4);
    this.countText.setPosition(width / 2, height / 2);
    this.countBadge.setVisible(true);
  }

  /** Outline playable / buyable cards. */
  setHighlight(color: number | null) {
    this.highlight.clear();
    if (color === null) return;
    this.highlight.lineStyle(3, color, 1);
    this.highlight.strokeRoundedRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 6);
  }

  setHovered(hovered: boolean) {
    this.artwork?.setHovered(hovered);
  }

  setLanguage(lang: Lang) {
    this.nameText.setText(getCardName(this.cardName, lang));
    this.fitText(this.nameText, this.cardWidth - 10);
    this.labelText.setText(getCardFrameStyle(this.cardName).label[lang]);
  }

  private fitText(text: Phaser.GameObjects.Text, maxWidth: number) {
    text.setScale(1);
    if (text.width > maxWidth) text.setScale(maxWidth / text.width);
  }
}
