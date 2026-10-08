/**
 * Single source of truth for table geometry, shared by the Phaser scene
 * (supply piles, hand) and the React overlays positioned over it (player
 * panels, status bar, trash, in-play strip). The canvas runs in RESIZE mode,
 * so these are CSS pixels relative to the table column.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PileGrid {
  /** Top-left corner of the first pile. */
  x: number;
  y: number;
  cols: number;
  pileWidth: number;
  pileHeight: number;
  gap: number;
}

export interface TableLayout {
  opponentPanel: Rect;
  base: PileGrid;
  /** Free slot next to Curse in the base grid. */
  trash: Rect;
  kingdom: PileGrid;
  inPlay: Rect;
  statusBar: Rect;
  myPanel: Rect;
  /** Region the hand row is centered in. */
  hand: Rect & { cardWidth: number; cardHeight: number };
}

const MARGIN = 12;
const GAP = 8;
const PANEL_HEIGHT = 44;
const PANEL_WIDTH = 210;
const STATUS_HEIGHT = 64;
const IN_PLAY_HEIGHT = 34;
const MIN_RATIO = 0.75; // pile height / width: never flatter than this
const MAX_RATIO = 1.25; // ...and never taller than this
const MAX_KINGDOM_WIDTH = 190;
const BASE_SCALE = 0.8; // base pile width relative to a kingdom pile

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function pileCenter(grid: PileGrid, index: number): { x: number; y: number } {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: grid.x + col * (grid.pileWidth + grid.gap) + grid.pileWidth / 2,
    y: grid.y + row * (grid.pileHeight + grid.gap) + grid.pileHeight / 2,
  };
}

export function computeTableLayout(width: number, height: number): TableLayout {
  // Bottom up: hand, status bar, in-play strip.
  const handHeight = Math.round(clamp(height * 0.19, 96, 168));
  const handWidth = Math.round(handHeight * 0.72);
  const handTop = height - MARGIN - handHeight;
  const statusTop = handTop - 14 - STATUS_HEIGHT;
  const inPlayTop = statusTop - 6 - IN_PLAY_HEIGHT;
  const supplyBottom = inPlayTop - 8;

  // Widths first: base piles are BASE_SCALE of a kingdom pile so the two
  // base columns never crowd the kingdom out. Heights then stretch into the
  // available space, between square-ish and portrait.
  const baseTop = MARGIN + PANEL_HEIGHT + GAP;
  const kingdomRowHeight = (supplyBottom - MARGIN - GAP) / 2;
  const baseRowHeight = (supplyBottom - baseTop - 3 * GAP) / 4;
  const kingdomWidth = Math.floor(
    clamp(
      Math.min(
        (width - 2 * MARGIN - 7 * GAP) / (5 + 2 * BASE_SCALE),
        kingdomRowHeight / MIN_RATIO,
        baseRowHeight / MIN_RATIO / BASE_SCALE,
      ),
      56,
      MAX_KINGDOM_WIDTH,
    ),
  );
  const kingdomHeight = Math.floor(Math.min(kingdomRowHeight, kingdomWidth * MAX_RATIO));
  const baseWidth = Math.floor(kingdomWidth * BASE_SCALE);
  const baseHeight = Math.floor(Math.min(baseRowHeight, baseWidth * MAX_RATIO));
  const baseRight = MARGIN + 2 * baseWidth + GAP;

  // Kingdom: 2 rows x 5, centered in the remaining width.
  const kingdomLeft = baseRight + 2 * GAP;
  const regionWidth = width - MARGIN - kingdomLeft;
  const kingdomSpan = 5 * kingdomWidth + 4 * GAP;

  const contentWidth = width - 2 * MARGIN;
  const statusWidth = Math.min(contentWidth, 960);

  return {
    opponentPanel: { x: MARGIN, y: MARGIN, width: PANEL_WIDTH, height: PANEL_HEIGHT },
    base: { x: MARGIN, y: baseTop, cols: 2, pileWidth: baseWidth, pileHeight: baseHeight, gap: GAP },
    trash: {
      x: MARGIN + baseWidth + GAP,
      y: baseTop + 3 * (baseHeight + GAP),
      width: baseWidth,
      height: baseHeight,
    },
    kingdom: {
      x: Math.round(kingdomLeft + (regionWidth - kingdomSpan) / 2),
      y: MARGIN,
      cols: 5,
      pileWidth: kingdomWidth,
      pileHeight: kingdomHeight,
      gap: GAP,
    },
    inPlay: { x: MARGIN, y: inPlayTop, width: contentWidth, height: IN_PLAY_HEIGHT },
    statusBar: {
      x: Math.round((width - statusWidth) / 2),
      y: statusTop,
      width: statusWidth,
      height: STATUS_HEIGHT,
    },
    myPanel: { x: MARGIN, y: handTop, width: PANEL_WIDTH, height: handHeight },
    hand: {
      x: MARGIN + PANEL_WIDTH + 2 * GAP,
      y: handTop,
      width: width - MARGIN - (MARGIN + PANEL_WIDTH + 2 * GAP),
      height: handHeight,
      cardWidth: handWidth,
      cardHeight: handHeight,
    },
  };
}

/** X centers for `count` hand cards, overlapping them if the row is too wide. */
export function handPositions(hand: TableLayout['hand'], count: number): number[] {
  if (count === 0) return [];
  const naturalStep = hand.cardWidth + GAP;
  const step = count > 1 ? Math.min(naturalStep, (hand.width - hand.cardWidth) / (count - 1)) : 0;
  const rowWidth = hand.cardWidth + step * (count - 1);
  const firstCenter = hand.x + (hand.width - rowWidth) / 2 + hand.cardWidth / 2;
  return Array.from({ length: count }, (_, i) => firstCenter + i * step);
}
