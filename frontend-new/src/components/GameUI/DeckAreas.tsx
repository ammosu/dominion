import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardName, CARD_DATA } from '../../utils/cardData';
import styles from './DeckAreas.module.css';

export function DeckAreas() {
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);
  const [showDiscard, setShowDiscard] = useState(false);

  if (!currentPlayer) return null;

  const text = {
    deck: { zh: '牌庫', en: 'Deck' },
    discard: { zh: '棄牌堆', en: 'Discard' },
    hand: { zh: '手牌', en: 'Hand' },
  };

  // Count cards in discard pile
  const discardCounts: Record<string, number> = {};
  for (const card of currentPlayer.discard) {
    discardCounts[card] = (discardCounts[card] || 0) + 1;
  }

  const getCardTypeColor = (cardName: string): string => {
    const data = CARD_DATA[cardName];
    if (!data) return '#a09888';
    switch (data.type) {
      case 'treasure': return '#c4a462';
      case 'victory': return '#6aaa6a';
      case 'action': return '#a0b8d0';
      case 'curse': return '#b080c0';
      default: return '#a09888';
    }
  };

  return (
    <>
      <div className={styles.container}>
        {/* Deck pile */}
        <div className={styles.pile}>
          <div className={`${styles.card} ${styles.deck}`}>
            🃏
            <div className={styles.count}>{currentPlayer.deck.length}</div>
          </div>
          <div className={styles.label}>{text.deck[language]}</div>
        </div>

        {/* Discard pile - clickable */}
        <div className={styles.pile}>
          <div
            className={`${styles.card} ${styles.discard} ${currentPlayer.discard.length > 0 ? styles.clickable : ''}`}
            onClick={() => currentPlayer.discard.length > 0 && setShowDiscard(!showDiscard)}
          >
            🗑️
            <div className={styles.count}>{currentPlayer.discard.length}</div>
          </div>
          <div className={styles.label}>
            {text.discard[language]}
            {currentPlayer.discard.length > 0 && (
              <span className={styles.viewHint}>
                {language === 'zh' ? ' (點擊檢視)' : ' (click)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hand indicator - positioned above cards, not overlapping */}
      <div className={styles.handIndicator}>
        {text.hand[language]} ({currentPlayer.hand.length})
      </div>

      {/* Discard pile viewer */}
      {showDiscard && (
        <div className={styles.discardOverlay} onClick={() => setShowDiscard(false)}>
          <div className={styles.discardModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.discardHeader}>
              <span>{language === 'zh' ? '棄牌堆' : 'Discard Pile'} ({currentPlayer.discard.length})</span>
              <button className={styles.closeButton} onClick={() => setShowDiscard(false)}>✕</button>
            </div>
            <div className={styles.discardContent}>
              {Object.entries(discardCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cardName, count]) => (
                  <div
                    key={cardName}
                    className={styles.discardCard}
                    style={{ borderLeftColor: getCardTypeColor(cardName) }}
                  >
                    <span className={styles.discardCardName}>
                      {getCardName(cardName, language)}
                    </span>
                    <span className={styles.discardCardCount}>×{count}</span>
                  </div>
                ))
              }
              {currentPlayer.discard.length === 0 && (
                <div className={styles.emptyDiscard}>
                  {language === 'zh' ? '棄牌堆為空' : 'Discard pile is empty'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
