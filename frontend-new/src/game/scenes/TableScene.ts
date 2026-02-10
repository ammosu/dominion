import Phaser from 'phaser';

export class TableScene extends Phaser.Scene {
  constructor() {
    super('TableScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 顯示桌面背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d4a3e);

    // 測試文字
    this.add.text(width / 2, height / 2, 'Phaser Table Scene', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }
}
