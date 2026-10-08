import Phaser from 'phaser';
import { Preloader } from '../scenes/Preloader';
import { TableScene } from '../scenes/TableScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: '100%',
  height: '100%',
  backgroundColor: '#2d4a3e',
  parent: 'phaser-container',
  scale: {
    // One canvas pixel per CSS pixel so React overlays line up with the table.
    mode: Phaser.Scale.RESIZE,
  },
  scene: [Preloader, TableScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};
