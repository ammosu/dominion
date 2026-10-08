import { describe, expect, it } from 'vitest';
import { computeTableLayout, handPositions, pileCenter, type Rect } from './tableLayout';

const bottom = (r: Rect) => r.y + r.height;
const right = (r: Rect) => r.x + r.width;

describe.each([
  [1092, 900],
  [840, 700],
  [1600, 1000],
])('table layout at %ix%i', (width, height) => {
  const layout = computeTableLayout(width, height);
  const kingdomBottom = layout.kingdom.y + 2 * layout.kingdom.pileHeight + layout.kingdom.gap;
  const kingdomRight = layout.kingdom.x + 5 * layout.kingdom.pileWidth + 4 * layout.kingdom.gap;
  const baseBottom = layout.base.y + 4 * layout.base.pileHeight + 3 * layout.base.gap;
  const baseRight = layout.base.x + 2 * layout.base.pileWidth + layout.base.gap;

  it('keeps everything inside the table', () => {
    expect(kingdomRight).toBeLessThanOrEqual(width);
    expect(bottom(layout.hand)).toBeLessThanOrEqual(height);
    expect(right(layout.statusBar)).toBeLessThanOrEqual(width);
  });

  it('stacks supply, in-play strip, status bar and hand without overlap', () => {
    expect(kingdomBottom).toBeLessThanOrEqual(layout.inPlay.y);
    expect(baseBottom).toBeLessThanOrEqual(layout.inPlay.y);
    expect(bottom(layout.inPlay)).toBeLessThanOrEqual(layout.statusBar.y);
    expect(bottom(layout.statusBar)).toBeLessThanOrEqual(layout.hand.y);
  });

  it('keeps the kingdom to the right of the base cards', () => {
    expect(layout.kingdom.x).toBeGreaterThanOrEqual(baseRight);
  });

  it('puts the trash in the slot next to Curse', () => {
    const curse = pileCenter(layout.base, 6);
    expect(layout.trash.y + layout.trash.height / 2).toBeCloseTo(curse.y);
    expect(layout.trash.x).toBeGreaterThan(curse.x);
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
