import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardFrameStyle, getCardName } from '../../utils/cardData';
import { IN_PLAY_CARD_MIN_HEIGHT, IN_PLAY_LABEL_WIDTH, inPlaySlots, type Rect } from '../../game/tableLayout';
import { MiniCard } from '../../fx/miniCard';
import { useCardPreview } from './useCardPreview';
import styles from './PlayedCards.module.css';

/**
 * Cards the current player has in play this turn: small cards when the
 * area is tall enough, name chips on cramped tables. The area itself is
 * always there (`data-fx="inplay"`) so effects can fly cards into it.
 */
export function PlayedCards({ rect }: { rect: Rect }) {
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const gameOver = useGameStore((state) => state.gameState?.game_over);
  const language = useUIStore((state) => state.language);
  const artStyle = useUIStore((state) => state.artStyle);
  const { previewProps } = useCardPreview();
  const cards = currentPlayer && !gameOver ? currentPlayer.in_play : [];
  const label = language === 'zh' ? '出牌區' : 'In play';

  if (rect.height >= IN_PLAY_CARD_MIN_HEIGHT) {
    const slots = inPlaySlots(rect, cards.length, IN_PLAY_LABEL_WIDTH);
    return (
      <>
        <div
          className={styles.area}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          data-fx="inplay"
        >
          {cards.length > 0 && (
            <span className={styles.sideLabel} style={{ left: slots[0].x - rect.x - IN_PLAY_LABEL_WIDTH }}>
              {label}
            </span>
          )}
        </div>
        {cards.map((card, index) => (
          <MiniCard
            key={index}
            card={card}
            rect={slots[index]}
            lang={language}
            style={artStyle}
            className={styles.played}
            data-testid="played-card"
            {...previewProps(card)}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className={styles.container}
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      data-testid="played-cards"
      data-fx="inplay"
    >
      {cards.length > 0 && <span className={styles.label}>{label}</span>}
      {cards.map((card, index) => (
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
