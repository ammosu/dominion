import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './PlayedCards.module.css';

export function PlayedCards() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);

  if (!gameState || gameState.phase !== 'Buy') return null;

  const currentPlayer = gameState.players[gameState.current_player];

  // Calculate played treasures based on coins (simplified)
  // In a real implementation, backend should track this
  const playedTreasures: string[] = [];
  let remainingCoins = currentPlayer.coins;

  // This is a rough estimate - ideally backend should send played cards
  while (remainingCoins >= 3 && playedTreasures.length < 5) {
    playedTreasures.push('Gold');
    remainingCoins -= 3;
  }
  while (remainingCoins >= 2 && playedTreasures.length < 5) {
    playedTreasures.push('Silver');
    remainingCoins -= 2;
  }
  while (remainingCoins >= 1 && playedTreasures.length < 5) {
    playedTreasures.push('Copper');
    remainingCoins -= 1;
  }

  if (currentPlayer.coins === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.label}>
        {language === 'zh' ? '💎 已打出的寶物' : '💎 Played Treasures'}
      </div>
      <div className={styles.cards}>
        {playedTreasures.map((card, index) => (
          <div key={index} className={styles.card}>
            {card === 'Copper' && '🟤'}
            {card === 'Silver' && '⚪'}
            {card === 'Gold' && '🟡'}
            <span className={styles.cardName}>
              {language === 'zh'
                ? (card === 'Copper' ? '銅幣' : card === 'Silver' ? '銀幣' : '金幣')
                : card
              }
            </span>
          </div>
        ))}
        <div className={styles.totalCoins}>
          = 💰 {currentPlayer.coins}
        </div>
      </div>
    </div>
  );
}
