import Phaser from 'phaser';

export class SupplyPile extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardCount: number;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;
  private countText: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, count: number, cost: number) {
    super(scene, x, y);

    this.cardName = cardName;
    this.cardCount = count;

    // Card background
    this.cardBg = scene.add.rectangle(0, 0, 70, 100, 0xffffff);
    this.add(this.cardBg);

    // Card name
    this.cardText = scene.add.text(0, -10, cardName, {
      fontSize: '11px',
      color: '#000000',
      wordWrap: { width: 60 },
      align: 'center',
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    // Count badge
    const countBg = scene.add.circle(0, 30, 15, 0x333333, 0.8);
    this.countText = scene.add.text(0, 30, count.toString(), {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.countText.setOrigin(0.5);
    this.add(countBg);
    this.add(this.countText);

    // Cost badge
    const costBg = scene.add.circle(25, -35, 12, 0xFFD700, 1);
    const costText = scene.add.text(25, -35, cost.toString(), {
      fontSize: '12px',
      color: '#000000',
      fontStyle: 'bold',
    });
    costText.setOrigin(0.5);
    this.costBadge = scene.add.container(0, 0, [costBg, costText]);
    this.add(this.costBadge);

    scene.add.existing(this);

    // Interactive
    this.setSize(70, 100);
    this.setInteractive({ useHandCursor: true });

    // Hover effect
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
  }

  private onPointerOver() {
    this.scene.tweens.add({
      targets: this,
      scale: 1.05,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    this.scene.events.emit('supply-card-hovered', this.cardName);
  }

  private onPointerOut() {
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
    this.scene.events.emit('supply-card-hovered', null);
  }

  private onPointerDown() {
    this.scene.events.emit('supply-card-clicked', this.cardName);
  }

  updateCount(count: number) {
    this.cardCount = count;
    this.countText.setText(count.toString());

    // Gray out if empty
    if (count === 0) {
      this.cardBg.setFillStyle(0x888888);
      this.setAlpha(0.5);
      this.disableInteractive();
    }
  }

  getCardName(): string {
    return this.cardName;
  }

  getCount(): number {
    return this.cardCount;
  }
}
