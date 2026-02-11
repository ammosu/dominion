import Phaser from 'phaser';
import { Card } from '../objects/Card';
import { Hand } from '../objects/Hand';
import { SupplyArea } from '../objects/SupplyArea';
import { CardAnimations } from '../animations/CardAnimations';
import { SoundManager } from '../../utils/SoundManager';

export class TableScene extends Phaser.Scene {
  private hand!: Hand;
  private supplyArea!: SupplyArea;
  private currentLang: 'en' | 'zh' = 'zh';

  constructor() {
    super('TableScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 桌面背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

    // 建立手牌區
    this.hand = new Hand(this);

    // Hand will be populated from game state via updateHand()
    // (Removed hardcoded test cards)

    // Create supply area
    this.supplyArea = new SupplyArea(this);

    // Listen to supply card events
    this.events.on('supply-card-clicked', (cardName: string) => {
      console.log('Supply card clicked:', cardName);
      SoundManager.getInstance().playCardBuy();
      this.events.emit('buy-card-request', cardName);
    });

    this.events.on('supply-card-hovered', (cardName: string | null) => {
      this.events.emit('supply-card-hover-changed', cardName);
    });

    // 啟用拖放
    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      gameObject.emit('drag', pointer, dragX, dragY);
    });

    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      gameObject.emit('dragstart', pointer);
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
      gameObject.emit('dragend', pointer, dropped);
    });

    // 監聽卡片點擊
    this.events.on('card-clicked', (cardName: string) => {
      console.log('Card clicked:', cardName);
      SoundManager.getInstance().playCardPlay();
      // 發送到外部（React）
      this.events.emit('play-card-request', cardName);
    });

    // 監聽卡片 Hover
    this.events.on('card-hovered', (cardName: string | null) => {
      this.events.emit('card-hover-changed', cardName);
    });

    // Animation event listeners
    this.events.on('animate-draw', (cardName: string) => {
      SoundManager.getInstance().playCardDraw();
      const deckX = 100;
      const deckY = 400;
      const handY = 650;
      const handX = this.cameras.main.width / 2;

      const card = CardAnimations.animateDrawCard(
        this,
        cardName,
        deckX,
        deckY,
        handX,
        handY,
        () => {
          this.hand.addCard(card);
        }
      );
    });

    this.events.on('animate-buy', (data: { cardName: string; pileX: number; pileY: number }) => {
      const discardX = 200;
      const discardY = 400;

      CardAnimations.animateBuyCard(
        this,
        data.cardName,
        data.pileX,
        data.pileY,
        discardX,
        discardY
      );
    });
  }

  // Add method to update supply
  updateSupply(supply: Record<string, number>, costs: Record<string, number>) {
    if (!this.supplyArea) {
      this.supplyArea = new SupplyArea(this);
    }
    if (this.supplyArea.getPile(Object.keys(supply)[0])) {
      this.supplyArea.updateSupply(supply);
    } else {
      this.supplyArea.setupSupply(supply, costs, this.currentLang);
    }
  }

  // Add method to update hand from game state
  updateHand(handCards: string[]) {
    if (!this.hand) {
      this.hand = new Hand(this);
    }

    // Clear existing cards
    this.hand.clear();

    // Create new cards from game state with current language
    handCards.forEach((cardName) => {
      const card = new Card(this, 0, 0, cardName, this.currentLang);
      this.hand.addCard(card);
    });
  }

  // Add method to update language for all visible cards
  updateLanguage(lang: 'en' | 'zh') {
    this.currentLang = lang;

    // Update hand cards
    if (this.hand) {
      this.hand.getCards().forEach((card) => {
        card.updateLanguage(lang);
      });
    }

    // Update supply cards
    if (this.supplyArea) {
      this.supplyArea.updateLanguage(lang);
    }
  }
}
