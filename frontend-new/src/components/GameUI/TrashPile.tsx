import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import type { Rect } from '../../game/tableLayout';
import { CardListModal } from './CardListModal';
import styles from './TrashPile.module.css';

/** The trash, in the free slot of the base-card grid; click to see its contents. */
export function TrashPile({ rect }: { rect: Rect }) {
  const trash = useGameStore((state) => state.gameState?.trash);
  const language = useUIStore((state) => state.language);
  const [open, setOpen] = useState(false);
  if (!trash) return null;
  const title = language === 'zh' ? '移除區' : 'Trash';

  return (
    <>
      <button
        className={styles.trash}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        onClick={() => setOpen(true)}
        data-testid="trash-pile"
      >
        <span className={styles.count}>{trash.length}</span>
        <span className={styles.icon}>🗑️</span>
        <span className={styles.label}>{title}</span>
      </button>
      {open && <CardListModal title={title} cards={trash} onClose={() => setOpen(false)} />}
    </>
  );
}
