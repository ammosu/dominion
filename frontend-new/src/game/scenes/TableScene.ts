import Phaser from 'phaser';
import { Hand } from '../objects/Hand';
import { SupplyArea } from '../objects/SupplyArea';
import { SoundManager } from '../../utils/SoundManager';
import { computeTableLayout } from '../tableLayout';
import { loadArtStyle } from '../artTextures';
import type { ArtStyle } from '../../utils/cardData';

/**
 * Draws the Supply and the viewer's hand. The canvas fills the table column
 * in device pixels; the camera zooms by the pixel ratio so this scene works
 * in CSS pixels, re-laid out on resize from the same `computeTableLayout`
 * the React overlays use.
 */
export class TableScene extends Phaser.Scene {
  hand!: Hand;
  private supplyArea!: SupplyArea;
  private background!: Phaser.GameObjects.Rectangle;
  private currentLang: 'en' | 'zh' = 'zh';
  private supply: Record<string, number> = {};
  private kingdom: string[] = [];
  private handCards: string[] = [];
  private buyable: ReadonlySet<string> = new Set();
  private playable: ReadonlySet<string> = new Set();

  constructor() {
    super('TableScene');
  }

  create() {
    this.background = this.add.rectangle(0, 0, 1, 1, 0x2d4a3e).setOrigin(0);
    this.fitCamera();
    this.hand = new Hand(this);
    this.supplyArea = new SupplyArea(this);

    // A tap opens the card's details first (with a Buy button); a click buys.
    this.events.on('supply-card-clicked', (cardName: string, touch: boolean) => {
      if (touch) {
        this.events.emit('supply-card-inspect', cardName);
        return;
      }
      SoundManager.getInstance().playCardBuy();
      this.events.emit('buy-card-request', cardName);
    });
    this.events.on('supply-card-hovered', (cardName: string | null) => {
      this.events.emit('supply-card-hover-changed', cardName);
    });
    this.events.on('card-clicked', (cardName: string) => {
      SoundManager.getInstance().playCardPlay();
      this.events.emit('play-card-request', cardName);
    });
    this.events.on('card-hovered', (cardName: string | null) => {
      this.events.emit('card-hover-changed', cardName);
    });

    this.scale.on('resize', this.relayout, this);
  }

  /** False until create() ran; GameContainer re-syncs everything once it has. */
  private get ready() {
    return this.hand !== undefined;
  }

  /** Table size in CSS pixels (the canvas is shown at 1/ratio zoom). */
  private get viewSize() {
    return { width: this.scale.width * this.scale.zoom, height: this.scale.height * this.scale.zoom };
  }

  private fitCamera() {
    const { width, height } = this.viewSize;
    this.cameras.main.setOrigin(0, 0).setZoom(1 / this.scale.zoom);
    this.background.setSize(width, height);
  }

  private layout() {
    const { width, height } = this.viewSize;
    return computeTableLayout(width, height);
  }

  private relayout() {
    if (!this.ready) return;
    this.fitCamera();
    this.buildSupply();
    this.buildHand();
  }

  private buildSupply() {
    if (Object.keys(this.supply).length === 0) return;
    this.supplyArea.build(this.layout(), this.supply, this.kingdom, this.currentLang);
    this.supplyArea.setBuyable(this.buyable);
  }

  private buildHand() {
    this.hand.build(this.layout(), this.handCards, this.currentLang);
    this.hand.setPlayable(this.playable);
  }

  /** Rebuilds the piles when the kingdom changes, otherwise updates counts. */
  updateSupply(supply: Record<string, number>, _costs: Record<string, number>, kingdom: string[] = []) {
    if (!this.ready) return;
    const kingdomChanged = kingdom.join() !== this.kingdom.join() || Object.keys(this.supply).length === 0;
    this.supply = supply;
    this.kingdom = kingdom;
    if (kingdomChanged) {
      this.buildSupply();
    } else {
      this.supplyArea.updateCounts(supply);
      this.supplyArea.setBuyable(this.buyable);
    }
  }

  updateHand(handCards: string[]) {
    if (!this.ready) return;
    this.handCards = handCards;
    this.buildHand();
  }

  /** Outline cards that can be bought / played right now. */
  setHighlights(buyable: string[], playable: string[]) {
    this.buyable = new Set(buyable);
    this.playable = new Set(playable);
    if (!this.ready) return;
    this.supplyArea.setBuyable(this.buyable);
    this.hand.setPlayable(this.playable);
  }

  /** Switches card artwork, loading the set on first use, then redraws. */
  setArtStyle(style: ArtStyle) {
    if (loadArtStyle(this, style)) {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.relayout());
      this.load.start();
    } else {
      this.relayout();
    }
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.currentLang = lang;
    if (!this.ready) return;
    this.supplyArea.updateLanguage(lang);
    this.hand.getCards().forEach((card) => card.updateLanguage(lang));
  }
}
