import { describe, expect, it } from 'vitest';
import {
  getCardArtPath,
  getCardTextureKey,
  getConfiguredCardArt,
} from './cardData';

describe('card artwork metadata', () => {
  it('uses a stable non-localized Phaser texture key', () => {
    expect(getCardTextureKey('Smithy')).toBe('card-art-smithy');
  });

  it('returns no path for a card without configured artwork', () => {
    expect(getCardArtPath('Village')).toBeUndefined();
  });

  it('starts with no configured artwork before pilot assets are added', () => {
    expect(getConfiguredCardArt()).toEqual([]);
  });
});
