import { useUIStore } from '../../store/uiStore';
import { compareForHand, getCardFrameStyle, getCardName } from '../../utils/cardData';
import styles from './CardListModal.module.css';

interface CardListModalProps {
  title: string;
  cards: string[];
  onClose: () => void;
}

/** Read-only list of a pile's contents (discard pile, trash), grouped with counts. */
export function CardListModal({ title, cards, onClose }: CardListModalProps) {
  const language = useUIStore((state) => state.language);
  const counts = new Map<string, number>();
  cards.forEach((card) => counts.set(card, (counts.get(card) ?? 0) + 1));

  return (
    <div className={styles.discardOverlay} onClick={onClose}>
      <div className={styles.discardModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.discardHeader}>
          <span>{title} ({cards.length})</span>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div className={styles.discardContent}>
          {[...counts.keys()].sort(compareForHand).map((card) => (
            <div key={card} className={styles.discardCard} style={{ borderLeftColor: getCardFrameStyle(card).color }}>
              <span className={styles.discardCardName}>{getCardName(card, language)}</span>
              <span className={styles.discardCardCount}>×{counts.get(card)}</span>
            </div>
          ))}
          {cards.length === 0 && (
            <div className={styles.emptyDiscard}>{language === 'zh' ? '沒有卡片' : 'Empty'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
