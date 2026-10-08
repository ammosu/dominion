import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { useFxStore } from '../../fx/fxStore';
import styles from './TurnBanner.module.css';

/** Brief banner across the table when a turn starts ("Your turn", "Bot's turn"); raised by the effects director. */
export function TurnBanner() {
  const language = useUIStore((state) => state.language);
  const banner = useFxStore((state) => state.banner);
  const viewer = useGameStore((state) => state.viewer);
  const name = useGameStore((state) => (banner ? state.gameState?.players[banner.player]?.name : undefined));

  if (!banner) return null;
  const zh = language === 'zh';
  const mine = banner.player === viewer;

  return (
    <div
      key={banner.id}
      className={`${styles.banner} ${mine ? '' : styles.other}`}
      onAnimationEnd={() => useFxStore.getState().set({ banner: null })}
      role="status"
      data-testid="turn-banner"
    >
      <span className={styles.title}>{mine ? (zh ? '輪到你' : 'Your turn') : zh ? `${name} 的回合` : `${name}'s turn`}</span>
      <span className={styles.turn}>{zh ? `第 ${banner.turn} 回合` : `Turn ${banner.turn}`}</span>
    </div>
  );
}
