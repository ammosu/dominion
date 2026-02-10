import Phaser from 'phaser';

export class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string) {
    super(scene, x, y);

    this.cardName = cardName;

    // 臨時：使用簡單矩形代表卡片
    this.cardBg = scene.add.rectangle(0, 0, 80, 120, 0xffffff);
    this.add(this.cardBg);

    // 卡片名稱
    this.cardText = scene.add.text(0, 0, cardName, {
      fontSize: '12px',
      color: '#000000',
      wordWrap: { width: 70 },
      align: 'center',
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    scene.add.existing(this);
  }

  getCardName(): string {
    return this.cardName;
  }
}
