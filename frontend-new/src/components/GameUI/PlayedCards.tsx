import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardName } from '../../utils/cardData';
import styles from './PlayedCards.module.css';

const TREASURES = ['Copper', 'Silver', 'Gold'];

export function PlayedCards() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const prevHandRef = useRef<string[]>([]);
  const playedRef = useRef<string[]>([]);

  useEffect(() => {
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.current_player];

    // Reset played cards when phase changes to Action (new turn)
    if (gameState.phase === 'Action') {
      playedRef.current = [];
      prevHandRef.current = [...currentPlayer.hand];
      return;
    }

    // During Buy phase, track treasures that left the hand
    if (gameState.phase === 'Buy') {
      const prevHand = prevHandRef.current;
      const currentHand = currentPlayer.hand;

      // Find cards that were in prev hand but not in current hand
      const remaining = [...currentHand];
      const newlyPlayed: string[] = [];

      for (const card of prevHand) {
        const idx = remaining.indexOf(card);
        if (idx >= 0) {
          remaining.splice(idx, 1);
        } else if (TREASURES.includes(card)) {
          newlyPlayed.push(card);
        }
      }

      if (newlyPlayed.length > 0) {
        playedRef.current = [...playedRef.current, ...newlyPlayed];
      }
      prevHandRef.current = [...currentHand];
    }
  }, [gameState?.players, gameState?.phase, gameState?.current_player]);

  if (!gameState || gameState.phase !== 'Buy') return null;

  const currentPlayer = gameState.players[gameState.current_player];
  const played = playedRef.current;

  if (played.length === 0 && currentPlayer.coins === 0) return null;

  const treasureEmoji: Record<string, string> = {
    Copper: '🟤',
    Silver: '⚪',
    Gold: '🟡',
  };

  return (
    <div className={styles.container} data-testid="played-cards">
      <div className={styles.label}>
        {language === 'zh' ? '💎 已打出的寶物' : '💎 Played Treasures'}
      </div>
      <div className={styles.cards}>
        {played.map((card, index) => (
          <div key={index} className={styles.card}>
            {treasureEmoji[card] || '💎'}
            <span className={styles.cardName}>
              {getCardName(card, language)}
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
