import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

export class PhaserGame {
  private game: Phaser.Game | null = null;

  constructor(containerId: string) {
    const config = {
      ...gameConfig,
      parent: containerId,
    };
    this.game = new Phaser.Game(config);
  }

  destroy() {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  getScene<T extends Phaser.Scene>(key: string): T | null {
    return this.game?.scene.getScene(key) as T | null;
  }
}
