import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './DeckAreas.module.css';

export function DeckAreas() {
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);

  if (!currentPlayer) return null;

  const text = {
    deck: { zh: '牌庫', en: 'Deck' },
    discard: { zh: '棄牌堆', en: 'Discard' },
    hand: { zh: '👇 你的手牌', en: '👇 Your Hand' },
  };

  return (
    <>
      <div className={styles.container}>
        {/* Deck pile */}
        <div className={styles.pile}>
          <div className={`${styles.card} ${styles.deck}`}>
            🃏
            <div className={styles.count}>{currentPlayer.deck_size}</div>
          </div>
          <div className={styles.label}>{text.deck[language]}</div>
        </div>

        {/* Discard pile */}
        <div className={styles.pile}>
          <div className={`${styles.card} ${styles.discard}`}>
            🗑️
            <div className={styles.count}>{currentPlayer.discard_size}</div>
          </div>
          <div className={styles.label}>{text.discard[language]}</div>
        </div>
      </div>

      {/* Hand indicator */}
      <div className={styles.handIndicator}>
        {text.hand[language]} ({currentPlayer.hand.length})
      </div>
    </>
  );
}
