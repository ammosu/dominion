import Phaser from 'phaser';
import { getConfiguredCardArt, isPixelated, type ArtStyle } from '../utils/cardData';

const REGISTRY_KEY = 'artStyle';

/** The art style card faces should use, stored on the game registry. */
export function currentArtStyle(scene: Phaser.Scene): ArtStyle {
  return scene.registry.get(REGISTRY_KEY);
}

/**
 * Makes `style` the active art style, queueing any textures that are not
 * loaded yet. Returns true if loads were queued (the caller's loader must
 * run); pixel-art textures get nearest-neighbour filtering once loaded.
 */
export function loadArtStyle(scene: Phaser.Scene, style: ArtStyle): boolean {
  scene.registry.set(REGISTRY_KEY, style);
  const missing = getConfiguredCardArt(style).filter(({ textureKey }) => !scene.textures.exists(textureKey));
  missing.forEach(({ textureKey, path }) => scene.load.image(textureKey, path));
  const applyFilter = () => {
    if (!isPixelated(style)) return;
    getConfiguredCardArt(style).forEach(({ textureKey }) => {
      if (scene.textures.exists(textureKey)) {
        scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
  };
  if (missing.length === 0) {
    applyFilter();
    return false;
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, applyFilter);
  return true;
}
