import { describe, expect, it } from 'vitest';
import { computeTableLayout, handPositions, pileCenter, type PileGrid, type Rect } from './tableLayout';

const bottom = (r: Rect) => r.y + r.height;
const right = (r: Rect) => r.x + r.width;
const gridBottom = (g: PileGrid, rows: number) => g.y + rows * g.pileHeight + (rows - 1) * g.gap;
const gridRight = (g: PileGrid) => g.x + g.cols * g.pileWidth + (g.cols - 1) * g.gap;
const baseRows = (g: PileGrid) => Math.ceil(8 / g.cols);

// Table column sizes: desktops minus the log column, tablets, phones.
describe.each([
  [1092, 900],
  [840, 700],
  [1600, 1000],
  [1026, 768],
  [960, 720],
  [2220, 1440],
  [844, 390],
  [667, 375],
  [375, 667],
  [390, 844],
  [430, 932],
  [768, 1024],
])('table layout at %ix%i', (width, height) => {
  const layout = computeTableLayout(width, height);
  const { kingdom, base } = layout;

  it('keeps everything inside the table', () => {
    expect(gridRight(kingdom)).toBeLessThanOrEqual(width);
    expect(gridRight(base)).toBeLessThanOrEqual(width);
    expect(bottom(layout.hand)).toBeLessThanOrEqual(height);
    expect(right(layout.statusBar)).toBeLessThanOrEqual(width);
    expect(right(layout.myPanel)).toBeLessThanOrEqual(width);
  });

  it('gives piles and hand cards room for artwork', () => {
    expect(base.pileHeight).toBeGreaterThanOrEqual(48);
    expect(kingdom.pileHeight).toBeGreaterThanOrEqual(48);
    expect(layout.hand.cardHeight).toBeGreaterThanOrEqual(72);
  });

  it('stacks supply, in-play strip, status bar and hand without overlap', () => {
    expect(gridBottom(kingdom, 2)).toBeLessThanOrEqual(layout.inPlay.y);
    expect(gridBottom(base, baseRows(base))).toBeLessThanOrEqual(layout.inPlay.y);
    expect(bottom(layout.inPlay)).toBeLessThanOrEqual(layout.statusBar.y);
    expect(bottom(layout.statusBar)).toBeLessThanOrEqual(layout.hand.y);
  });

  it('keeps the player panels clear of the supply', () => {
    expect(bottom(layout.opponentPanel)).toBeLessThanOrEqual(base.y);
    if (layout.mode === 'portrait') {
      expect(bottom(layout.myPanel)).toBeLessThanOrEqual(kingdom.y);
    } else {
      expect(right(layout.myPanel)).toBeLessThanOrEqual(layout.hand.x);
    }
  });

  it('separates the base cards from the kingdom', () => {
    if (layout.mode === 'portrait') {
      expect(base.y).toBeGreaterThanOrEqual(gridBottom(kingdom, 2));
    } else {
      expect(kingdom.x).toBeGreaterThanOrEqual(gridRight(base));
    }
  });

  it('puts the trash in the slot after Curse', () => {
    const curse = pileCenter(base, 6);
    expect(layout.trash.y + layout.trash.height / 2).toBeCloseTo(curse.y);
    expect(layout.trash.x).toBeGreaterThan(curse.x);
  });
});

describe('layout modes', () => {
  it('uses the portrait arrangement on phones held upright', () => {
    expect(computeTableLayout(390, 844).mode).toBe('portrait');
    expect(computeTableLayout(768, 1024).mode).toBe('portrait');
  });

  it('uses the wide arrangement on desktops and phones held sideways', () => {
    expect(computeTableLayout(1092, 900).mode).toBe('wide');
    expect(computeTableLayout(844, 390).mode).toBe('wide');
  });

  it('grows piles and hand on large screens', () => {
    const small = computeTableLayout(960, 720);
    const large = computeTableLayout(2220, 1440);
    expect(large.kingdom.pileWidth).toBeGreaterThan(small.kingdom.pileWidth * 1.4);
    expect(large.hand.cardHeight).toBeGreaterThan(small.hand.cardHeight * 1.4);
  });
});

describe('hand positions', () => {
  const hand = { x: 100, y: 0, width: 500, height: 150, cardWidth: 100, cardHeight: 150 };

  it('centers a short row', () => {
    const xs = handPositions(hand, 1);
    expect(xs).toEqual([350]);
  });

  it('overlaps cards to stay inside a narrow region', () => {
    const xs = handPositions(hand, 10);
    expect(xs[0] - hand.cardWidth / 2).toBeGreaterThanOrEqual(hand.x - 0.001);
    expect(xs[9] + hand.cardWidth / 2).toBeLessThanOrEqual(hand.x + hand.width + 0.001);
  });
});
