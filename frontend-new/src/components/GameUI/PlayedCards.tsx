import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardName, getCardType } from '../../utils/cardData';
import styles from './PlayedCards.module.css';

const TYPE_ICON: Record<string, string> = {
  Copper: '🟤',
  Silver: '⚪',
  Gold: '🟡',
};

/** Cards the current player has in play this turn, as tracked by the server. */
export function PlayedCards() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!gameState || !currentPlayer || gameState.game_over) return null;

  const played = currentPlayer.in_play;
  if (played.length === 0 && currentPlayer.coins === 0) return null;

  return (
    <div className={styles.container} data-testid="played-cards">
      <div className={styles.label}>
        {language === 'zh' ? '🃏 本回合已打出' : '🃏 In Play'}
      </div>
      <div className={styles.cards}>
        {played.map((card, index) => (
          <div key={index} className={styles.card}>
            {TYPE_ICON[card] ?? (getCardType(card) === 'action' ? '⚔️' : '💎')}
            <span className={styles.cardName}>{getCardName(card, language)}</span>
          </div>
        ))}
        <div className={styles.totalCoins}>
          = 💰 {currentPlayer.coins}
        </div>
      </div>
    </div>
  );
}
