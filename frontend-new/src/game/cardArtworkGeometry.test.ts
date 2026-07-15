import { describe, expect, it } from 'vitest';
import { calculateCoverCrop } from './cardArtworkGeometry';

describe('calculateCoverCrop', () => {
  it('keeps the complete image when source and target are both 2:3', () => {
    expect(calculateCoverCrop(768, 1152, 80, 120)).toEqual({
      x: 0,
      y: 0,
      width: 768,
      height: 1152,
    });
  });

  it('center-crops a portrait image for a landscape supply pile', () => {
    const crop = calculateCoverCrop(768, 1152, 110, 90);

    expect(crop.x).toBe(0);
    expect(crop.y).toBeCloseTo(261.82, 1);
    expect(crop.width).toBe(768);
    expect(crop.height).toBeCloseTo(628.36, 1);
  });

  it('rejects zero-sized source or target bounds', () => {
    expect(() => calculateCoverCrop(0, 1152, 80, 120)).toThrow(
      'Artwork dimensions must be positive',
    );
  });
});
