/**
 * Single source of truth for table geometry, shared by the Phaser scene
 * (supply piles, hand) and the React overlays positioned over it (player
 * panels, status bar, trash, in-play strip). The canvas runs in RESIZE mode,
 * so these are CSS pixels relative to the table column.
 *
 * Two arrangements:
 * - `wide` (desktop, tablet landscape, phone landscape): base cards to the
 *   left of the kingdom, opponent strip top-left, my panel beside the hand.
 * - `portrait` (phones, narrow windows): kingdom 5x2 above base 4x2, both
 *   player strips in one top row, full-width status bar and hand.
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

export type LayoutMode = 'wide' | 'portrait';

export interface TableLayout {
  mode: LayoutMode;
  /** Size factor for overlay text and controls (CSS `--ui`), >1 on big screens. */
  uiScale: number;
  opponentPanel: Rect;
  base: PileGrid;
  /** Free slot after Curse in the base grid. */
  trash: Rect;
  kingdom: PileGrid;
  /** Cards in play this turn: a strip, or a row of small cards when there is room. */
  inPlay: Rect;
  statusBar: Rect;
  myPanel: Rect;
  /** Region the hand row is centered in. */
  hand: Rect & { cardWidth: number; cardHeight: number };
}

const MIN_RATIO = 0.75; // pile height / width: never flatter than this
const MAX_RATIO = 1.25; // ...and never taller than this
const BASE_SCALE = 0.8; // wide mode: base pile width relative to a kingdom pile
const HAND_RATIO = 0.72; // hand card width / height
/** Base cards plus the trash slot (index 7). */
const BASE_SLOTS = 8;
const TRASH_SLOT = 7;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** dominion.games order: Province/Gold, Duchy/Silver, Estate/Copper, Curse. */
export const BASE_ORDER = ['Province', 'Gold', 'Duchy', 'Silver', 'Estate', 'Copper', 'Curse'];

/** Where `card`'s Supply pile is drawn, or null if it is not in this game. */
export function supplyPileRect(layout: TableLayout, kingdom: string[], card: string): Rect | null {
  const base = BASE_ORDER.indexOf(card);
  if (base >= 0) return slotRect(layout.base, base);
  const index = kingdom.indexOf(card);
  return index >= 0 ? slotRect(layout.kingdom, index) : null;
}

/** Width of the vertical "In play" label left of the small cards. */
export const IN_PLAY_LABEL_WIDTH = 24;

/** In-play strips at least this tall show small cards instead of name chips. */
export const IN_PLAY_CARD_MIN_HEIGHT = 56;

/**
 * Rects of `count` small cards in the in-play area: a centered row, after a
 * label column, overlapping when it gets crowded.
 */
export function inPlaySlots(rect: Rect, count: number, labelWidth: number): Rect[] {
  const height = rect.height - 6;
  const width = Math.round(height * HAND_RATIO);
  const room = rect.width - labelWidth;
  const step = count > 1 ? Math.min(width + 6, (room - width) / (count - 1)) : 0;
  const rowWidth = width + step * (count - 1);
  const left = rect.x + labelWidth + Math.max(0, (room - rowWidth) / 2);
  return Array.from({ length: count }, (_, i) => ({ x: left + i * step, y: rect.y + 3, width, height }));
}

export function pileCenter(grid: PileGrid, index: number): { x: number; y: number } {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: grid.x + col * (grid.pileWidth + grid.gap) + grid.pileWidth / 2,
    y: grid.y + row * (grid.pileHeight + grid.gap) + grid.pileHeight / 2,
  };
}

function slotRect(grid: PileGrid, index: number): Rect {
  const { x, y } = pileCenter(grid, index);
  return { x: x - grid.pileWidth / 2, y: y - grid.pileHeight / 2, width: grid.pileWidth, height: grid.pileHeight };
}

export function layoutMode(width: number, height: number): LayoutMode {
  return width < 600 || width < height * 0.8 ? 'portrait' : 'wide';
}

export function computeTableLayout(width: number, height: number): TableLayout {
  return layoutMode(width, height) === 'portrait' ? portraitLayout(width, height) : wideLayout(width, height);
}

function wideLayout(width: number, height: number): TableLayout {
  const short = height < 560;
  const uiScale = Math.round(clamp(height / 900, 1, 1.6) * 100) / 100;
  const margin = short ? 8 : 12;
  const gap = short ? 6 : 8;
  const panelHeight = short ? 36 : Math.round(44 * uiScale);
  const panelWidth = Math.round(clamp(width * 0.17, 170, 210 * uiScale));
  const statusHeight = short ? 48 : Math.round(clamp(height * 0.075, 56, 64 * uiScale));
  const inPlayHeight = short ? 24 : Math.round(34 * uiScale);

  // Bottom up: hand, status bar, in-play strip. Short tables (phones held
  // sideways) give the hand a bigger share: it is what gets tapped most.
  const handHeight = Math.round(clamp(height * (short ? 0.25 : 0.19), 72, 290));
  const handWidth = Math.round(handHeight * HAND_RATIO);
  const handTop = height - margin - handHeight;
  const statusTop = handTop - gap - statusHeight;
  const inPlayTop = statusTop - 4 - inPlayHeight;
  const supplyBottom = inPlayTop - gap;
  const baseTop = margin + panelHeight + gap;
  const maxKingdomWidth = clamp(height * 0.24, 150, 360);

  // Base cards in 2 columns (dominion.games) or, when the table is short,
  // 4 columns x 2 rows; take whichever leaves the bigger kingdom piles.
  // Widths first, then heights stretch into the space, square-ish to portrait.
  const fit = (baseCols: number) => {
    const baseRows = Math.ceil(BASE_SLOTS / baseCols);
    const kingdomRowHeight = (supplyBottom - margin - gap) / 2;
    const baseRowHeight = (supplyBottom - baseTop - (baseRows - 1) * gap) / baseRows;
    const kingdomWidth = Math.floor(
      clamp(
        Math.min(
          (width - 2 * margin - (baseCols + 5) * gap) / (5 + baseCols * BASE_SCALE),
          kingdomRowHeight / MIN_RATIO,
          baseRowHeight / MIN_RATIO / BASE_SCALE,
        ),
        40,
        maxKingdomWidth,
      ),
    );
    const baseWidth = Math.floor(kingdomWidth * BASE_SCALE);
    return {
      baseCols,
      kingdomWidth,
      kingdomHeight: Math.floor(Math.min(kingdomRowHeight, kingdomWidth * MAX_RATIO)),
      baseWidth,
      baseHeight: Math.floor(Math.min(baseRowHeight, baseWidth * MAX_RATIO)),
    };
  };
  const two = fit(2);
  const four = fit(4);
  const area = (f: typeof two) => f.kingdomWidth * f.kingdomHeight;
  const { baseCols, kingdomWidth, kingdomHeight, baseWidth, baseHeight } = area(four) > area(two) * 1.1 ? four : two;

  const base: PileGrid = { x: margin, y: baseTop, cols: baseCols, pileWidth: baseWidth, pileHeight: baseHeight, gap };
  const baseRight = margin + baseCols * baseWidth + (baseCols - 1) * gap;

  // Kingdom: 2 rows x 5, centered in the remaining width.
  const kingdomLeft = baseRight + 2 * gap;
  const regionWidth = width - margin - kingdomLeft;
  const kingdomSpan = 5 * kingdomWidth + 4 * gap;

  const contentWidth = width - 2 * margin;
  const statusWidth = Math.min(contentWidth, 1000 * uiScale);
  const handLeft = margin + panelWidth + 2 * gap;
  const kingdomX = Math.round(kingdomLeft + Math.max(0, regionWidth - kingdomSpan) / 2);

  // In play: under the kingdom, growing into whatever room the piles left.
  const kingdomBottom = margin + 2 * kingdomHeight + gap;
  const inPlayRoom = Math.round(clamp(inPlayTop + inPlayHeight - kingdomBottom - gap, inPlayHeight, 150 * uiScale));

  return {
    mode: 'wide',
    uiScale,
    opponentPanel: { x: margin, y: margin, width: Math.max(panelWidth, baseRight - margin), height: panelHeight },
    base,
    trash: slotRect(base, TRASH_SLOT),
    kingdom: {
      x: kingdomX,
      y: margin,
      cols: 5,
      pileWidth: kingdomWidth,
      pileHeight: kingdomHeight,
      gap,
    },
    inPlay: {
      x: Math.min(kingdomX, baseRight + gap),
      y: inPlayTop + inPlayHeight - inPlayRoom,
      width: width - margin - Math.min(kingdomX, baseRight + gap),
      height: inPlayRoom,
    },
    statusBar: { x: Math.round((width - statusWidth) / 2), y: statusTop, width: statusWidth, height: statusHeight },
    myPanel: { x: margin, y: handTop, width: panelWidth, height: handHeight },
    hand: {
      x: handLeft,
      y: handTop,
      width: width - margin - handLeft,
      height: handHeight,
      cardWidth: handWidth,
      cardHeight: handHeight,
    },
  };
}

function portraitLayout(width: number, height: number): TableLayout {
  const narrow = width < 500;
  const margin = narrow ? 6 : 12;
  const gap = narrow ? 5 : 8;
  const panelHeight = narrow ? 40 : 48;
  // Narrow status bars stack counters, prompt and buttons in three rows.
  const statusHeight = width < 560 ? 104 : 72;
  const inPlayHeight = narrow ? 26 : 32;
  const contentWidth = width - 2 * margin;

  // Fixed rows: panels on top; in-play strip, status bar and hand at the bottom.
  const fixed = margin + panelHeight + gap + gap + inPlayHeight + 4 + statusHeight + gap + margin;
  // Four hand cards fit side by side; more overlap but keep their names visible.
  const maxHand = Math.min(clamp(height * 0.2, 110, 240), (contentWidth - 3 * gap) / 4 / HAND_RATIO);
  const minHand = Math.min(clamp(height * 0.15, 84, 170), maxHand);

  // Supply: kingdom 5x2 over base 4x2, all piles the same size, separated
  // by a larger gap. Width-bound first, then shrink to leave the hand room.
  const sectionGap = 2 * gap;
  const supplyHeight = (pileHeight: number) => 4 * pileHeight + 2 * gap + sectionGap;
  let pileWidth = Math.floor(Math.min((contentWidth - 4 * gap) / 5, 200));
  let pileHeight = Math.floor(pileWidth * MAX_RATIO);
  const supplyRoom = height - fixed - minHand;
  if (supplyHeight(pileHeight) > supplyRoom) {
    pileHeight = Math.max(30, Math.floor((supplyRoom - 2 * gap - sectionGap) / 4));
    pileWidth = Math.min(pileWidth, Math.floor(pileHeight / MIN_RATIO));
  }
  const handHeight = Math.round(clamp(height - fixed - supplyHeight(pileHeight), minHand, maxHand));
  // Whatever is left over spaces the supply away from the top strip.
  const slack = Math.max(0, height - fixed - supplyHeight(pileHeight) - handHeight);

  const kingdomTop = margin + panelHeight + gap + Math.round(slack / 3);
  const kingdomSpan = 5 * pileWidth + 4 * gap;
  const baseSpan = 4 * pileWidth + 3 * gap;
  const kingdom: PileGrid = {
    x: Math.round((width - kingdomSpan) / 2),
    y: kingdomTop,
    cols: 5,
    pileWidth,
    pileHeight,
    gap,
  };
  const base: PileGrid = {
    x: Math.round((width - baseSpan) / 2),
    y: kingdomTop + 2 * pileHeight + gap + sectionGap,
    cols: 4,
    pileWidth,
    pileHeight,
    gap,
  };

  const handTop = height - margin - handHeight;
  const statusTop = handTop - gap - statusHeight;
  const inPlayBottom = statusTop - 4;
  // In play grows up into the room left under the base cards.
  const baseBottom = base.y + 2 * pileHeight + gap;
  const inPlayRoom = Math.round(clamp(inPlayBottom - baseBottom - gap, inPlayHeight, 130));
  const half = (contentWidth - gap) / 2;

  return {
    mode: 'portrait',
    uiScale: 1,
    opponentPanel: { x: margin, y: margin, width: half, height: panelHeight },
    base,
    trash: slotRect(base, TRASH_SLOT),
    kingdom,
    inPlay: { x: margin, y: inPlayBottom - inPlayRoom, width: contentWidth, height: inPlayRoom },
    statusBar: { x: margin, y: statusTop, width: contentWidth, height: statusHeight },
    myPanel: { x: margin + half + gap, y: margin, width: half, height: panelHeight },
    hand: {
      x: margin,
      y: handTop,
      width: contentWidth,
      height: handHeight,
      cardWidth: Math.round(handHeight * HAND_RATIO),
      cardHeight: handHeight,
    },
  };
}

/** X centers for `count` hand cards, overlapping them if the row is too wide. */
export function handPositions(hand: TableLayout['hand'], count: number): number[] {
  if (count === 0) return [];
  const naturalStep = hand.cardWidth + 8;
  const step = count > 1 ? Math.min(naturalStep, (hand.width - hand.cardWidth) / (count - 1)) : 0;
  const rowWidth = hand.cardWidth + step * (count - 1);
  const firstCenter = hand.x + (hand.width - rowWidth) / 2 + hand.cardWidth / 2;
  return Array.from({ length: count }, (_, i) => firstCenter + i * step);
}
