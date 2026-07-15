import Phaser from 'phaser';
import { getCardName } from '../../utils/cardData';
import { CardArtwork } from './CardArtwork';

export class Card extends Phaser.GameObjects.Container {
  private cardName: string;
  private cardBg: Phaser.GameObjects.Rectangle;
  private cardBorder: Phaser.GameObjects.Rectangle;
  private artwork?: CardArtwork;
  private cardText: Phaser.GameObjects.Text;
  private baseX: number = 0; // True base position set by Hand
  private baseY: number = 0; // True base position set by Hand
  private baseRotation: number = 0; // True base rotation set by Hand
  private isHovered: boolean = false;
  private isDragging: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, cardName: string, lang: 'en' | 'zh' = 'zh') {
    super(scene, x, y);

    this.cardName = cardName;

    // Card background with type-based color
    const bgColor = this.getCardBgColor(cardName);
    this.cardBg = scene.add.rectangle(0, 0, 80, 120, bgColor);
    this.cardBg.setStrokeStyle(1, 0x999999);
    this.add(this.cardBg);

    this.artwork = CardArtwork.create(scene, cardName, 80, 120);
    if (this.artwork) {
      this.add(this.artwork);
    }

    this.cardBorder = scene.add.rectangle(0, 0, 80, 120, 0x000000, 0);
    this.cardBorder.setStrokeStyle(1, 0x999999);
    this.add(this.cardBorder);

    // Card name (use provided language)
    const displayName = getCardName(cardName, lang);
    this.cardText = scene.add.text(0, this.artwork ? -47 : 0, displayName, {
      fontSize: '12px',
      color: this.artwork ? '#fff1d2' : '#000000',
      wordWrap: { width: 70 },
      align: 'center',
      resolution: window.devicePixelRatio || 2, // Use device pixel ratio for sharp text
    });
    this.cardText.setOrigin(0.5);
    if (this.artwork) {
      this.cardText.setShadow(0, 2, '#000000', 4, true, true);
    }
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

  /** Set the true base position (called by Hand after arranging cards) */
  setBasePosition(x: number, y: number) {
    this.baseX = x;
    this.baseY = y;
  }

  /** Set the true base rotation (called by Hand after arranging cards) */
  setBaseRotation(rotation: number) {
    this.baseRotation = rotation;
  }

  private setupDragHandlers() {
    this.on('dragstart', this.onDragStart, this);
    this.on('drag', this.onDrag, this);
    this.on('dragend', this.onDragEnd, this);
  }

  private onDragStart() {
    // Only set base position once at start of drag, not on every drag event
    if (!this.isDragging) {
      this.isDragging = true;
      this.artwork?.setHovered(false);

      // 卡片浮起動畫 - straighten when dragging
      this.scene.tweens.add({
        targets: this,
        y: this.y - 20,
        rotation: 0, // Straighten for dragging
        scale: 1.1,
        duration: 200,
        ease: 'Back.easeOut',
      });

      // 提升 z-index
      this.setDepth(100);
    }
  }

  private onDrag(_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) {
    this.x = dragX;
    this.y = dragY;
  }

  private onDragEnd(_pointer: Phaser.Input.Pointer, dropped: boolean) {
    this.isDragging = false;
    if (!dropped) {
      // 返回原位
      this.returnToOriginalPosition();
    }
  }

  returnToOriginalPosition() {
    this.scene.tweens.add({
      targets: this,
      x: this.baseX,
      y: this.baseY,
      rotation: this.baseRotation, // Restore rotation
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
    // Only trigger hover effect if not already hovering or dragging
    if (!this.isHovered && !this.isDragging) {
      this.isHovered = true;
      this.artwork?.setHovered(true);
      this.cardBorder.setStrokeStyle(2, 0xffd27a);

      // Hover 效果 - straighten rotation, lift up, and scale
      this.scene.tweens.add({
        targets: this,
        y: this.baseY - 40, // Lift more for better visibility
        rotation: 0, // Straighten the card
        scale: 1.1, // Slightly enlarge
        duration: 200,
        ease: 'Cubic.easeOut',
      });

      // Bring to front
      this.setDepth(50);

      // 通知 Scene
      this.scene.events.emit('card-hovered', this.cardName);
    }
  }

  private onPointerOut() {
    // 取消 Hover - return to base position and rotation
    if (this.isHovered && !this.isDragging) {
      this.isHovered = false;
      this.artwork?.setHovered(false);
      this.cardBorder.setStrokeStyle(1, 0x999999);

      this.scene.tweens.add({
        targets: this,
        y: this.baseY,
        rotation: this.baseRotation, // Restore original rotation
        scale: 1.0, // Restore original scale
        duration: 200,
        ease: 'Cubic.easeOut',
      });

      // Restore original depth
      this.setDepth(10);

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
