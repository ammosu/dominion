import Phaser from 'phaser';
import { getCardArtPath, getCardTextureKey } from '../../utils/cardData';
import { calculateCoverCrop } from '../cardArtworkGeometry';

export class CardArtwork extends Phaser.GameObjects.Container {
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

    const image = scene.add.image(0, 0, textureKey);
    const crop = calculateCoverCrop(frame.width, frame.height, width, height);
    image.setCrop(crop.x, crop.y, crop.width, crop.height);
    image.setScale(width / crop.width, height / crop.height);
    this.add(image);

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
}
