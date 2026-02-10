import Phaser from 'phaser';
import { Preloader } from '../scenes/Preloader';
import { TableScene } from '../scenes/TableScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 800,
  backgroundColor: '#2d4a3e',
  parent: 'phaser-container',
  scene: [Preloader, TableScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};
