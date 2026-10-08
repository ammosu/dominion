import { compareForHand, isTreasure } from '../utils/cardData';
import { IN_PLAY_LABEL_WIDTH, handPositions, inPlaySlots, supplyPileRect, type Rect, type TableLayout } from '../game/tableLayout';
import { useUIStore } from '../store/uiStore';
import type { GameState } from '../types/game';
import type { GameEvent } from '../types/events';
import { useFxStore } from './fxStore';
import { prefersReducedMotion } from './motion';
import { createMiniCard } from './miniCard';
import { MOAT_SHIELD_URL } from './art';
import styles from './Fx.module.css';

const CARD_RATIO = 0.72;
const FLIGHT_MS = 360;
const OTHER_FLIGHT_MS = 440;
const STAGGER_MS = 70;

/** A point a card flies from or to, and how tall the card looks there. */
interface Spot {
  x: number;
  y: number;
  height: number;
}

const spotOf = (rect: Rect): Spot => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, height: rect.height });

/** Small DOM targets (counters, panels) receive a small card. */
const smallSpot = (rect: Rect): Spot => ({ ...spotOf(rect), height: Math.max(24, Math.min(rect.height * 1.4, 56)) });

/** Turn moves that mean another player is acting: the table waits for the replay. */
const isOthersMove = (event: GameEvent, viewer: number) =>
  'player' in event && event.player !== viewer && ['Play', 'Buy', 'Cleanup', 'TurnStart'].includes(event.kind);

interface Parked {
  card: string;
  el: HTMLElement | null;
}

/**
 * Plays a message's events over the table, in order: cards fly between hand,
 * play area, Supply, piles and trash. The state has already been applied, so
 * everything here is cosmetic and can be cut short at any time. Another
 * player's turn is replayed at a readable pace while the table waits
 * (`busy`); a tap skips to the end.
 */
export class Director {
  private timers: number[] = [];
  private ghosts = new Set<HTMLElement>();
  /** Cards each player has in play during the replay, with their ghosts. */
  private inPlay = new Map<number, Parked[]>();
  private viewer = 0;
  private readonly root: HTMLElement;
  private readonly layout: () => TableLayout | null;

  constructor(root: HTMLElement, layout: () => TableLayout | null) {
    this.root = root;
    this.layout = layout;
  }

  run(events: GameEvent[], prev: GameState | null, next: GameState, viewer: number) {
    this.skip();
    if (!prev || events.length === 0) return;

    this.viewer = viewer;
    // The viewer's turn count is final in `next`; another player's turn is still under way.
    const turnStart = (player: number) => {
      const turn = (player === viewer ? next : prev).players[player].turns_taken + 1;
      useFxStore.getState().set({ banner: { id: Date.now(), player, turn } });
    };

    if (prefersReducedMotion() || !this.layout()) {
      const mine = events.find((e) => e.kind === 'TurnStart' && e.player === viewer);
      if (mine && mine.kind === 'TurnStart') turnStart(viewer);
      return;
    }

    const busy = events.some((e) => isOthersMove(e, viewer));
    if (busy) {
      const first = events.find((e) => isOthersMove(e, viewer));
      useFxStore.getState().set({ busy: true, actor: first && 'player' in first ? first.player : null });
      window.addEventListener('pointerdown', this.onSkip, true);
    }

    this.inPlay.clear();
    prev.players.forEach((p, i) => this.inPlay.set(i, p.in_play.map((card) => ({ card, el: null }))));
    const ctx: Context = { prev, next, viewer, handNames: groupNames(prev.players[viewer]?.hand ?? []) };

    let at = 0;
    events.forEach((event, i) => {
      const following = events[i + 1];
      this.later(at, () => {
        if ('player' in event && isOthersMove(event, viewer)) useFxStore.getState().set({ actor: event.player });
        if (event.kind === 'TurnStart') turnStart(event.player);
        // An attack that Moat stops ends at the shield instead of hitting.
        const blocked = event.kind === 'Attack' && following?.kind === 'Blocked' && following.player === event.target;
        this.apply(event, ctx, blocked);
      });
      at += this.gap(event, viewer);
    });
    this.later(at + (busy ? 250 : FLIGHT_MS + 100), () => this.end());
  }

  /** Cuts everything short: the table shows the final state. */
  skip = () => {
    this.clear();
    this.end();
  };

  /**
   * A tap during a replay skips it, but the table keeps waiting a moment:
   * the same press must not also buy or play the card under it.
   */
  private onSkip = () => {
    window.removeEventListener('pointerdown', this.onSkip, true);
    this.clear();
    this.later(400, () => this.end());
  };

  private clear() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    this.ghosts.forEach((el) => el.remove());
    this.ghosts.clear();
    this.inPlay.clear();
  }

  private end() {
    window.removeEventListener('pointerdown', this.onSkip, true);
    // Parked ghosts sit exactly where PlayedCards draws the real cards.
    this.inPlay.forEach((cards) => cards.forEach((c) => c.el && this.drop(c.el)));
    this.inPlay.clear();
    if (useFxStore.getState().busy) useFxStore.getState().set({ busy: false, actor: null });
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  /** Time until the next event starts. */
  private gap(event: GameEvent, viewer: number): number {
    const mine = !('player' in event) || event.player === viewer;
    switch (event.kind) {
      case 'Buy':
      case 'Shuffle':
      case 'GameOver':
        return 0;
      case 'TurnStart':
        return mine ? 0 : 650;
      case 'Play':
        return mine ? 120 + STAGGER_MS * (event.cards.length - 1) : 480 + STAGGER_MS * (event.cards.length - 1);
      case 'Draw':
        return mine ? 150 : 260;
      case 'Attack':
        return 560;
      case 'Blocked':
        return 700;
      case 'Cleanup':
        return mine ? 220 : 480;
      default:
        return mine ? 160 : 420;
    }
  }

  private apply(event: GameEvent, ctx: Context, blocked = false) {
    const layout = this.layout();
    if (!layout) return;
    const mine = 'player' in event && event.player === ctx.viewer;
    const duration = mine ? FLIGHT_MS : OTHER_FLIGHT_MS;

    switch (event.kind) {
      case 'Play': {
        const parked = this.inPlay.get(event.player) ?? [];
        event.cards.forEach((card, i) => {
          const from = event.from === 'Discard' ? this.pile('discard', event.player) : this.handSpot(card, event.player, ctx);
          const entry: Parked = { card, el: null };
          parked.push(entry);
          const slot = this.slots(layout, parked.length)[parked.length - 1];
          const el = this.fly(card, from, spotOf(slot), { delay: i * STAGGER_MS, duration, keep: !mine });
          if (!mine) entry.el = el;
          if (mine && isTreasure(card) && i < 3) this.sparks(spotOf(slot), i * STAGGER_MS + duration);
        });
        this.inPlay.set(event.player, parked);
        if (!mine) this.restack(layout, parked);
        break;
      }
      case 'Draw':
        for (let i = 0; i < Math.min(event.count, 5); i++) {
          const to = mine ? spotOf(layout.hand) : this.pile('hand', event.player);
          this.fly(null, this.pile('deck', event.player), to, { delay: i * 55, duration: duration - 60 });
        }
        break;
      case 'Gain': {
        const pile = supplyPileRect(layout, ctx.next.kingdom, event.card);
        if (!pile) break;
        const to =
          event.to === 'Hand' ? (mine ? spotOf(layout.hand) : this.pile('hand', event.player))
          : event.to === 'Deck' ? this.pile('deck', event.player)
          : this.pile('discard', event.player);
        this.fly(event.card, spotOf(pile), to, { duration: duration + 60, arc: 0.18, land: true });
        break;
      }
      case 'Discard':
      case 'Topdeck':
      case 'Trash':
        event.cards.slice(0, 5).forEach((card, i) => {
          const from = event.from === 'Deck' ? this.pile('deck', event.player) : this.handSpot(card, event.player, ctx);
          const trash = event.kind === 'Trash';
          const to = trash ? spotOf(layout.trash) : this.pile(event.kind === 'Topdeck' ? 'deck' : 'discard', event.player);
          this.fly(card, from, to, { delay: i * STAGGER_MS, duration, trash });
        });
        break;
      case 'Attack': {
        const parked = this.inPlay.get(event.player) ?? [];
        const index = parked.map((p) => p.card).lastIndexOf(event.card);
        const from = index >= 0 ? spotOf(this.slots(layout, parked.length)[index]) : this.pile('hand', event.player);
        this.strike(event.card, from, event.target, blocked);
        break;
      }
      case 'Blocked': {
        const target = this.anchor(`panel-${event.player}`);
        if (target) this.shield(target);
        break;
      }
      case 'Cleanup': {
        const parked = this.inPlay.get(event.player) ?? [];
        const slots = this.slots(layout, parked.length);
        const to = this.pile('discard', event.player);
        parked.forEach((entry, i) => {
          if (entry.el) {
            this.ghosts.delete(entry.el);
            entry.el.remove();
          }
          this.fly(entry.card, spotOf(slots[i]), to, { delay: i * 40, duration: duration - 60, arc: 0.1 });
        });
        this.inPlay.set(event.player, []);
        break;
      }
    }
  }

  /** Where a card leaves a player's hand: the viewer's grouped hand card, else their panel. */
  private handSpot(card: string, player: number, ctx: Context): Spot {
    const layout = this.layout()!;
    if (player !== ctx.viewer) return this.pile('hand', player);
    const index = ctx.handNames.indexOf(card);
    const xs = handPositions(layout.hand, ctx.handNames.length);
    const x = index >= 0 ? xs[index] : layout.hand.x + layout.hand.width / 2;
    return { x, y: layout.hand.y + layout.hand.cardHeight / 2, height: layout.hand.cardHeight };
  }

  /** A player's deck, discard pile or hand as drawn by PlayerPanel (`data-fx`), else the panel. */
  private pile(kind: 'deck' | 'discard' | 'hand', player: number): Spot {
    const rect = this.anchor(`${kind}-${player}`) ?? this.anchor(`panel-${player}`);
    if (rect) return rect.height > 70 ? spotOf(rect) : smallSpot(rect);
    const layout = this.layout()!;
    return smallSpot(player === this.viewer ? layout.myPanel : layout.opponentPanel);
  }

  private anchor(name: string): Rect | null {
    const table = this.root.parentElement;
    const el = table?.querySelector<HTMLElement>(`[data-fx="${name}"]`);
    if (!table || !el) return null;
    const t = table.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left - t.left, y: r.top - t.top, width: r.width, height: r.height };
  }

  private slots(layout: TableLayout, count: number): Rect[] {
    return inPlaySlots(layout.inPlay, count, IN_PLAY_LABEL_WIDTH);
  }

  /** Re-spaces parked ghosts after another card joined them. */
  private restack(layout: TableLayout, parked: Parked[]) {
    const slots = this.slots(layout, parked.length);
    parked.forEach((entry, i) => {
      if (entry.el && entry.el.dataset.parked) place(entry.el, slots[i]);
    });
    parked.forEach((entry, i) => {
      if (entry.el) entry.el.dataset.slot = JSON.stringify(slots[i]);
    });
  }

  /**
   * Flies a card (null: face-down) from one spot to another along a slight
   * arc. `keep` leaves it parked at the destination (another player's cards
   * in play); `trash` greys it out and shrinks it away.
   */
  private fly(
    card: string | null,
    from: Spot,
    to: Spot,
    { delay = 0, duration = FLIGHT_MS, arc = 0.25, keep = false, trash = false, land = false }: {
      delay?: number;
      duration?: number;
      arc?: number;
      keep?: boolean;
      trash?: boolean;
      land?: boolean;
    },
  ): HTMLElement {
    const { language, artStyle } = useUIStore.getState();
    const height = Math.max(from.height, to.height);
    const width = Math.round(height * CARD_RATIO);
    const el = createMiniCard(card, width, height, language, artStyle);
    el.classList.add(styles.ghost);
    this.root.append(el);
    this.ghosts.add(el);

    const at = (s: Spot, lift = 0, grow = 1) =>
      `translate(${s.x - width / 2}px, ${s.y - height / 2 - lift}px) scale(${(s.height / height) * grow})`;
    const mid: Spot = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, height: (from.height + to.height) / 2 };
    const lift = Math.min(120, Math.hypot(to.x - from.x, to.y - from.y) * arc);
    const frames: Keyframe[] = [
      { transform: at(from), opacity: 0 },
      { transform: at(from, 0, 1.04), opacity: 1, offset: 0.08 },
      { transform: at(mid, lift, 1.08), opacity: 1, offset: 0.5 },
      trash
        ? { transform: at(to, 0, 0.35), opacity: 0, filter: 'grayscale(1) brightness(0.6)' }
        : { transform: at(to), opacity: keep ? 1 : 0.9 },
    ];
    const flight = el.animate(frames, { duration, delay, easing: 'cubic-bezier(0.33, 0, 0.2, 1)', fill: 'both' });
    flight.onfinish = () => {
      if (land) this.burst(to);
      if (trash) this.dust(to);
      if (keep) {
        el.dataset.parked = '1';
        const slot = el.dataset.slot ? (JSON.parse(el.dataset.slot) as Rect) : null;
        flight.cancel();
        place(el, slot ?? { x: to.x - (to.height * CARD_RATIO) / 2, y: to.y - to.height / 2, width: to.height * CARD_RATIO, height: to.height });
        return;
      }
      this.drop(el, trash ? 0 : 140);
    };
    return el;
  }

  /**
   * An attack: a streak from the attacking card to the target's panel, then
   * a jolt of the panel (or, when `blocked`, it stops short of the shield).
   */
  private strike(card: string, from: Spot, player: number, blocked: boolean) {
    const target = this.anchor(`panel-${player}`);
    if (!target) return;
    const to = spotOf(target);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) - (blocked ? Math.max(target.height, 40) * 0.9 : target.height * 0.3);
    const el = document.createElement('div');
    el.className = `${styles.beam} ${card === 'Witch' ? styles.hex : ''}`;
    el.style.left = `${from.x}px`;
    el.style.top = `${from.y}px`;
    el.style.width = `${Math.max(0, length)}px`;
    el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    this.root.append(el);
    this.ghosts.add(el);
    const beam = el.animate(
      [
        { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
        { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.6 },
        { clipPath: 'inset(0 0 0 100%)', opacity: 0.6 },
      ],
      { duration: 420, easing: 'ease-in', fill: 'both' },
    );
    beam.onfinish = () => {
      el.remove();
      this.ghosts.delete(el);
    };
    if (blocked) return;
    window.setTimeout(() => {
      this.effect(card === 'Witch' ? styles.hexHit : styles.hit, to, 600);
      const panel = this.root.parentElement?.querySelector<HTMLElement>(`[data-fx="panel-${player}"]`);
      panel?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 320, easing: 'ease-out' },
      );
    }, 260);
  }

  /** Moat: a shield rises in front of the attacked player's panel. */
  private shield(target: Rect) {
    const { language } = useUIStore.getState();
    const el = document.createElement('div');
    el.className = styles.shield;
    el.style.backgroundImage = `url("${MOAT_SHIELD_URL}")`;
    el.style.left = `${target.x + target.width / 2}px`;
    el.style.top = `${target.y + target.height / 2}px`;
    el.dataset.label = language === 'zh' ? '護城河抵擋！' : 'Blocked by Moat!';
    this.root.append(el);
    this.ghosts.add(el);
    window.setTimeout(() => {
      el.remove();
      this.ghosts.delete(el);
    }, 1100);
  }

  /** Fades a ghost out and removes it. */
  private drop(el: HTMLElement, fade = 140) {
    if (fade === 0) {
      el.remove();
      this.ghosts.delete(el);
      return;
    }
    const out = el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: fade, fill: 'forwards' });
    out.onfinish = () => {
      el.remove();
      this.ghosts.delete(el);
    };
  }

  /** A gold ring where a gained card lands. */
  private burst(at: Spot) {
    this.effect(styles.burst, at, 520);
  }

  private dust(at: Spot) {
    this.effect(styles.dust, at, 600);
  }

  /** Gold sparks from a played Treasure to the coin counter. */
  private sparks(from: Spot, delay: number) {
    const coins = this.anchor('coins');
    if (!coins) return;
    const to = spotOf(coins);
    for (let i = 0; i < 2; i++) {
      const el = document.createElement('div');
      el.className = styles.spark;
      this.root.append(el);
      this.ghosts.add(el);
      const dx = (i - 0.5) * 18;
      const anim = el.animate(
        [
          { transform: `translate(${from.x + dx}px, ${from.y}px) scale(0.6)`, opacity: 0 },
          { transform: `translate(${(from.x + to.x) / 2 + dx}px, ${Math.min(from.y, to.y) - 30}px) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.5)`, opacity: 0.2 },
        ],
        { duration: 420, delay: delay + i * 60, easing: 'ease-in', fill: 'both' },
      );
      anim.onfinish = () => {
        el.remove();
        this.ghosts.delete(el);
      };
    }
  }

  private effect(className: string, at: Spot, ms: number) {
    const el = document.createElement('div');
    el.className = className;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    this.root.append(el);
    this.ghosts.add(el);
    window.setTimeout(() => {
      el.remove();
      this.ghosts.delete(el);
    }, ms);
  }
}

interface Context {
  prev: GameState;
  next: GameState;
  viewer: number;
  /** The viewer's hand as drawn (one card per name), before this message. */
  handNames: string[];
}

function groupNames(hand: string[]): string[] {
  return [...new Set(hand)].sort(compareForHand);
}

function place(el: HTMLElement, rect: Rect) {
  el.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.setProperty('--h', `${rect.height}px`);
}
