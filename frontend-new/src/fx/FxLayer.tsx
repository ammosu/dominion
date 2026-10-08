import { useEffect, useRef } from 'react';
import type { TableLayout } from '../game/tableLayout';
import type { GameState } from '../types/game';
import { Director } from './director';
import styles from './Fx.module.css';

let director: Director | null = null;

/** Animates what `next.events` did, starting from the table as it was in `prev`. */
export function playEvents(prev: GameState | null, next: GameState, viewer: number) {
  director?.run(next.events ?? [], prev, next, viewer);
}

/** The layer flying cards are drawn on, covering the table. */
export function FxLayer({ layout }: { layout: TableLayout | null }) {
  const root = useRef<HTMLDivElement>(null);
  const current = useRef(layout);
  current.current = layout;

  useEffect(() => {
    if (!root.current) return;
    const instance = new Director(root.current, () => current.current);
    director = instance;
    return () => {
      instance.skip();
      if (director === instance) director = null;
    };
  }, []);

  return <div ref={root} className={styles.layer} aria-hidden />;
}
