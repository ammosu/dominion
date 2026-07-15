import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
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

  it('returns no path for a card without configured artwork', () => {
    expect(getCardArtPath('Village')).toBeUndefined();
  });

  it('configures only the accepted pilot assets', () => {
    expect(getConfiguredCardArt().map(({ cardName }) => cardName)).toEqual([
      'Copper',
    ]);
  });

  it('maps Copper to an existing public WebP', () => {
    const path = getCardArtPath('Copper');
    expect(path).toBe('/assets/cards/copper.webp');
    expect(publicAssetExists(path!)).toBe(true);
  });
});
