import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './TurnBanner.module.css';

/** Brief "Your turn" banner across the table whenever the turn passes to this player. */
export function TurnBanner() {
  const language = useUIStore((state) => state.language);
  const [banner, setBanner] = useState<{ turn: number; id: number } | null>(null);

  useEffect(() => {
    let id = 0;
    return useGameStore.subscribe((state, previous) => {
      const next = state.gameState;
      const before = previous.gameState;
      // Not on the first state (game start / reconnect): only real hand-overs.
      if (!next || !before || next.game_over) return;
      if (next.current_player === state.viewer && before.current_player !== state.viewer) {
        setBanner({ turn: (next.players[state.viewer]?.turns_taken ?? 0) + 1, id: ++id });
      }
    });
  }, []);

  if (!banner) return null;
  const zh = language === 'zh';

  return (
    <div key={banner.id} className={styles.banner} onAnimationEnd={() => setBanner(null)} role="status" data-testid="turn-banner">
      <span className={styles.title}>{zh ? '輪到你' : 'Your turn'}</span>
      <span className={styles.turn}>{zh ? `第 ${banner.turn} 回合` : `Turn ${banner.turn}`}</span>
    </div>
  );
}
