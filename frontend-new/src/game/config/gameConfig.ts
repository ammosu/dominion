import Phaser from 'phaser';
import { Preloader } from '../scenes/Preloader';
import { TableScene } from '../scenes/TableScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#2d4a3e',
  parent: 'phaser-container',
  scale: {
    // PhaserGame sizes the canvas to the table in device pixels.
    mode: Phaser.Scale.NONE,
  },
  scene: [Preloader, TableScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};
