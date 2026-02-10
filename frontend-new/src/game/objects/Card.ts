import Phaser from 'phaser';

export class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;
  private originalX: number = 0;
  private originalY: number = 0;

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

    // 啟用拖放
    this.setSize(80, 120);
    this.setInteractive({ draggable: true });
    this.setupDragHandlers();
  }

  getCardName(): string {
    return this.cardName;
  }

  private setupDragHandlers() {
    this.on('dragstart', this.onDragStart, this);
    this.on('drag', this.onDrag, this);
    this.on('dragend', this.onDragEnd, this);
  }

  private onDragStart() {
    this.originalX = this.x;
    this.originalY = this.y;

    // 卡片浮起動畫
    this.scene.tweens.add({
      targets: this,
      y: this.y - 20,
      scale: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // 提升 z-index
    this.setDepth(100);
  }

  private onDrag(_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
    this.x = dragX;
    this.y = dragY;
  }

  private onDragEnd(_pointer: Phaser.Input.Pointer, dropped: boolean) {
    if (!dropped) {
      // 返回原位
      this.returnToOriginalPosition();
    }
  }

  returnToOriginalPosition() {
    this.scene.tweens.add({
      targets: this,
      x: this.originalX,
      y: this.originalY,
      scale: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setDepth(10);
      },
    });
  }
}
