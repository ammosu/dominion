import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CARD_DATA,
  getCardArtPath,
  getCardTextureKey,
  getConfiguredCardArt,
} from './cardData';

function publicAssetExists(publicPath: string): boolean {
  const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
  return existsSync(`${publicRoot}${publicPath.replace(/^\//, '')}`);
}

describe('card artwork metadata', () => {
  it('uses a stable non-localized Phaser texture key', () => {
    expect(getCardTextureKey('Smithy')).toBe('card-art-smithy');
  });

  it('returns no path for an unknown card', () => {
    expect(getCardArtPath('Unknown')).toBeUndefined();
  });

  it('configures artwork for every card', () => {
    expect(getConfiguredCardArt().map(({ cardName }) => cardName).sort()).toEqual(
      Object.keys(CARD_DATA).sort(),
    );
    expect(getConfiguredCardArt()).toHaveLength(33);
  });

  it('maps every configured artwork path to an existing public WebP', () => {
    getConfiguredCardArt().forEach(({ cardName, path }) => {
      expect(path).toBe(`/assets/cards/${cardName.toLowerCase()}.webp`);
      expect(publicAssetExists(path)).toBe(true);
    });
  });
});
