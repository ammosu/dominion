import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ART_STYLES,
  CARD_DATA,
  getCardArtPath,
  getCardTextureKey,
  getConfiguredCardArt,
} from './cardData';

function publicAssetExists(publicPath: string): boolean {
  const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
  return existsSync(`${publicRoot}${publicPath.slice(import.meta.env.BASE_URL.length)}`);
}

describe('card artwork metadata', () => {
  it('uses a stable non-localized Phaser texture key per style', () => {
    expect(getCardTextureKey('Smithy', 'pixel-art')).toBe('card-art-pixel-art-smithy');
  });

  it('returns no path for an unknown card', () => {
    expect(getCardArtPath('Unknown', 'cute')).toBeUndefined();
  });

  it.each(ART_STYLES.map((style) => style.id))('style %s has artwork for all 33 cards', (style) => {
    const art = getConfiguredCardArt(style);
    expect(art.map(({ cardName }) => cardName).sort()).toEqual(Object.keys(CARD_DATA).sort());
    art.forEach(({ cardName, path }) => {
      expect(path).toBe(`${import.meta.env.BASE_URL}assets/cards/${style}/${cardName.toLowerCase()}.webp`);
      expect(publicAssetExists(path), path).toBe(true);
    });
  });
});
