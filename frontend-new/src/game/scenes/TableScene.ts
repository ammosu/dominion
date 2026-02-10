import Phaser from 'phaser';
import { Card } from '../objects/Card';

export class TableScene extends Phaser.Scene {
  constructor() {
    super('TableScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 桌面背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

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

    // 測試：建立幾張卡片
    const testCards = ['Copper', 'Silver', 'Gold', 'Estate', 'Smithy'];
    testCards.forEach((cardName, i) => {
      new Card(this, 200 + i * 100, 400, cardName);
    });
  }
}
