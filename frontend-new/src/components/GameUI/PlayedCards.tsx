import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardFrameStyle, getCardName } from '../../utils/cardData';
import type { Rect } from '../../game/tableLayout';
import { useCardPreview } from './useCardPreview';
import styles from './PlayedCards.module.css';

/** Cards the current player has in play this turn, as tracked by the server. */
export function PlayedCards({ rect }: { rect: Rect }) {
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const gameOver = useGameStore((state) => state.gameState?.game_over);
  const language = useUIStore((state) => state.language);
  const { previewProps } = useCardPreview();

  if (!currentPlayer || gameOver || currentPlayer.in_play.length === 0) return null;

  return (
    <div
      className={styles.container}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      data-testid="played-cards"
    >
      <span className={styles.label}>{language === 'zh' ? '出牌區' : 'In play'}</span>
      {currentPlayer.in_play.map((card, index) => (
        <span
          key={index}
          className={styles.card}
          style={{ background: getCardFrameStyle(card).color }}
          {...previewProps(card)}
        >
          {getCardName(card, language)}
        </span>
      ))}
    </div>
  );
}
