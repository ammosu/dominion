import Phaser from 'phaser';
import { Card } from '../objects/Card';
import { Hand } from '../objects/Hand';

export class TableScene extends Phaser.Scene {
  private hand!: Hand;

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

    // 測試：建立 5 張手牌
    const testCards = ['Copper', 'Silver', 'Gold', 'Estate', 'Smithy'];
    testCards.forEach((cardName) => {
      const card = new Card(this, 0, 0, cardName);
      this.hand.addCard(card);
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
      // 發送到外部（React）
      this.events.emit('play-card-request', cardName);
    });

    // 監聽卡片 Hover
    this.events.on('card-hovered', (cardName: string | null) => {
      this.events.emit('card-hover-changed', cardName);
    });
  }
}
