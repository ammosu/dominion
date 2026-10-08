import Phaser from 'phaser';
import { Hand } from '../objects/Hand';
import { SupplyArea } from '../objects/SupplyArea';
import { SoundManager } from '../../utils/SoundManager';
import { computeTableLayout } from '../tableLayout';

/**
 * Draws the Supply and the viewer's hand. Runs in Phaser RESIZE mode: the
 * canvas fills the table column and everything is re-laid out on resize
 * from the same `computeTableLayout` the React overlays use.
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
    this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x2d4a3e).setOrigin(0);
    this.hand = new Hand(this);
    this.supplyArea = new SupplyArea(this);

    this.events.on('supply-card-clicked', (cardName: string) => {
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

  private layout() {
    return computeTableLayout(this.scale.width, this.scale.height);
  }

  private relayout() {
    this.background.setSize(this.scale.width, this.scale.height);
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
    this.handCards = handCards;
    this.buildHand();
  }

  /** Outline cards that can be bought / played right now. */
  setHighlights(buyable: string[], playable: string[]) {
    this.buyable = new Set(buyable);
    this.playable = new Set(playable);
    this.supplyArea.setBuyable(this.buyable);
    this.hand.setPlayable(this.playable);
  }

  updateLanguage(lang: 'en' | 'zh') {
    this.currentLang = lang;
    this.supplyArea.updateLanguage(lang);
    this.hand.getCards().forEach((card) => card.updateLanguage(lang));
  }
}
