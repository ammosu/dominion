import Phaser from 'phaser';
import { getCardName } from '../../utils/cardData';

export class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardText: Phaser.GameObjects.Text;
  private originalX: number = 0;
  private originalY: number = 0;
  private isHovered: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, lang: 'en' | 'zh' = 'zh') {
    super(scene, x, y);

    this.cardName = cardName;

    // Card background with type-based color
    const bgColor = this.getCardBgColor(cardName);
    this.cardBg = scene.add.rectangle(0, 0, 80, 120, bgColor);
    this.cardBg.setStrokeStyle(1, 0x999999);
    this.add(this.cardBg);

    // Card name (use provided language)
    const displayName = getCardName(cardName, lang);
    this.cardText = scene.add.text(0, 0, displayName, {
      fontSize: '12px',
      color: '#000000',
      wordWrap: { width: 70 },
      align: 'center',
      resolution: window.devicePixelRatio || 2, // Use device pixel ratio for sharp text
    });
    this.cardText.setOrigin(0.5);
    this.add(this.cardText);

    scene.add.existing(this);

    // 啟用拖放
    this.setSize(80, 120);
    this.setInteractive({ draggable: true, pixelPerfect: false }); // Disable pixel-perfect collision for better performance
    this.setupDragHandlers();

    // 點擊事件
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
  }

  getCardName(): string {
    return this.cardName;
  }

  updateLanguage(lang: 'en' | 'zh') {
    const translatedName = getCardName(this.cardName, lang);
    this.cardText.setText(translatedName);
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

  private onPointerDown() {
    // 發送事件到 Scene
    this.scene.events.emit('card-clicked', this.cardName);
  }

  private onPointerOver() {
    // Only store base position if not already hovering (prevents drift from rapid hovers)
    if (!this.isHovered) {
      this.originalX = this.x;
      this.originalY = this.y;
      this.isHovered = true;

      // Hover 效果
      this.scene.tweens.add({
        targets: this,
        y: this.originalY - 10,
        duration: 150,
        ease: 'Cubic.easeOut',
      });

      // 通知 Scene
      this.scene.events.emit('card-hovered', this.cardName);
    }
  }

  private onPointerOut() {
    // 取消 Hover - return to stored position
    if (this.isHovered) {
      this.isHovered = false;

      this.scene.tweens.add({
        targets: this,
        y: this.originalY,
        duration: 150,
        ease: 'Cubic.easeOut',
      });

      this.scene.events.emit('card-hovered', null);
    }
  }

  private getCardBgColor(cardName: string): number {
    const treasures = ['Copper', 'Silver', 'Gold'];
    const victory = ['Estate', 'Duchy', 'Province'];
    if (treasures.includes(cardName)) return 0xfff8dc; // cream/gold tint
    if (victory.includes(cardName)) return 0xe8f5e9; // light green
    if (cardName === 'Curse') return 0xf3e5f5; // light purple
    return 0xffffff; // white for action cards
  }
}
