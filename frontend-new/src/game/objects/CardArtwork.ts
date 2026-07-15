import Phaser from 'phaser';
import {
  CARD_DATA,
  getCardArtPath,
  getCardTextureKey,
} from '../../utils/cardData';
import {
  calculateCoverCrop,
  calculateHoverCrop,
  type CoverCrop,
} from '../cardArtworkGeometry';

const CARD_ART_TINTS = {
  treasure: 0xd6a84f,
  victory: 0x5f8f62,
  action: 0x8b929b,
  curse: 0x765080,
} as const;

export class CardArtwork extends Phaser.GameObjects.Container {
  private readonly image: Phaser.GameObjects.Image;
  private readonly targetWidth: number;
  private readonly targetHeight: number;
  private readonly restCrop: CoverCrop;
  private readonly hoverCrop: CoverCrop;
  private readonly cropState: CoverCrop;
  private readonly reducedMotion: boolean;

  private constructor(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ) {
    super(scene, 0, 0);

    const textureKey = getCardTextureKey(cardName);
    const frame = scene.textures.getFrame(textureKey);
    if (!frame) {
      throw new Error(`Missing loaded texture: ${textureKey}`);
    }

    this.targetWidth = width;
    this.targetHeight = height;
    this.restCrop = calculateCoverCrop(frame.width, frame.height, width, height);
    this.hoverCrop = calculateHoverCrop(this.restCrop);
    this.cropState = { ...this.restCrop };

    this.image = scene.add.image(0, 0, textureKey);
    this.applyCrop();
    this.add(this.image);

    const type = CARD_DATA[cardName].type;
    this.add([
      scene.add.rectangle(0, 0, width, height, CARD_ART_TINTS[type], 0.08),
      scene.add.rectangle(0, -height * 0.42, width, height * 0.2, 0x000000, 0.4),
      scene.add.rectangle(0, height * 0.4, width, height * 0.24, 0x000000, 0.44),
    ]);

    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    scene.add.existing(this);
  }

  static create(
    scene: Phaser.Scene,
    cardName: string,
    width: number,
    height: number,
  ): CardArtwork | undefined {
    const path = getCardArtPath(cardName);
    const textureKey = getCardTextureKey(cardName);
    if (!path || !scene.textures.exists(textureKey)) {
      return undefined;
    }

    return new CardArtwork(scene, cardName, width, height);
  }

  setHovered(hovered: boolean): void {
    this.scene.tweens.killTweensOf(this.cropState);

    if (this.reducedMotion) {
      Object.assign(this.cropState, this.restCrop);
      this.applyCrop();
      return;
    }

    const destination = hovered ? this.hoverCrop : this.restCrop;
    this.scene.tweens.add({
      targets: this.cropState,
      x: destination.x,
      y: destination.y,
      width: destination.width,
      height: destination.height,
      duration: 180,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.applyCrop(),
    });
  }

  private applyCrop(): void {
    const { x, y, width, height } = this.cropState;
    this.image.setCrop(x, y, width, height);
    this.image.setScale(this.targetWidth / width, this.targetHeight / height);
  }

  destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this.cropState);
    super.destroy(fromScene);
  }
}
