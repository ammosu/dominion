import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

/** Device pixels per CSS pixel the canvas renders at (capped for speed). */
const pixelRatio = () => Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

/**
 * Owns the Phaser game. The canvas is sized in device pixels and shown at
 * CSS size (zoom 1/ratio) so it stays sharp on high-density screens; scenes
 * zoom their camera by the ratio and keep working in CSS pixels.
 */
export class PhaserGame {
  private game: Phaser.Game | null = null;
  private readonly observer: ResizeObserver;

  constructor(containerId: string) {
    const parent = document.getElementById(containerId)!;
    const { width, height } = parent.getBoundingClientRect();
    const ratio = pixelRatio();
    this.game = new Phaser.Game({
      ...gameConfig,
      parent: containerId,
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
      scale: { ...gameConfig.scale, zoom: 1 / ratio },
    });

    this.observer = new ResizeObserver(([entry]) => this.fit(entry.contentRect.width, entry.contentRect.height));
    this.observer.observe(parent);
  }

  private fit(width: number, height: number) {
    if (!this.game || width === 0 || height === 0) return;
    const ratio = pixelRatio();
    this.game.scale.resize(Math.round(width * ratio), Math.round(height * ratio));
    // Refreshes the canvas' CSS size for the new game size (and ratio).
    this.game.scale.setZoom(1 / ratio);
  }

  destroy() {
    this.observer.disconnect();
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
  }

  getScene<T extends Phaser.Scene>(key: string): T | null {
    return this.game?.scene.getScene(key) as T | null;
  }
}
