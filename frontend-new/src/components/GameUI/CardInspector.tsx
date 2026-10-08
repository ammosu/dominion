import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { buyBlocker, requestBuyCard } from '../../game/GameContainer';
import { getCardCost } from '../../utils/cardData';
import { SoundManager } from '../../utils/SoundManager';
import { CardPreview } from './CardTooltip';
import styles from './CardInspector.module.css';
import previewStyles from './CardTooltip.module.css';

/**
 * Touch screens: tapping a Supply pile opens its details here, with a Buy
 * button (or the reason it cannot be bought), instead of buying at once.
 */
export function CardInspector() {
  const card = useUIStore((state) => state.inspectedCard);
  const close = () => useUIStore.getState().setInspectedCard(null);
  const language = useUIStore((state) => state.language);
  // Re-render when the game changes so the Buy button stays current.
  const remaining = useGameStore((state) => (card ? state.gameState?.supply[card] : undefined));
  useGameStore((state) => state.gameState);
  if (!card) return null;

  const zh = language === 'zh';
  const blocker = buyBlocker(card);
  const buy = () => {
    SoundManager.getInstance().playCardBuy();
    requestBuyCard(card);
    close();
  };

  return (
    <div className={styles.overlay} onClick={close} data-testid="card-inspector">
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <CardPreview card={card} className={`${styles.card} ${previewStyles.shortArt}`}>
          {remaining !== undefined && (
            <div className={styles.remaining}>{zh ? `供應區剩 ${remaining} 張` : `${remaining} left in the Supply`}</div>
          )}
        </CardPreview>
        {blocker && <div className={styles.reason}>{blocker[language]}</div>}
        <div className={styles.buttons}>
          <button className={styles.close} onClick={close}>
            {zh ? '關閉' : 'Close'}
          </button>
          <button className={styles.buy} onClick={buy} disabled={blocker !== null} data-testid="inspector-buy">
            {zh ? `購買（${getCardCost(card)} 金幣）` : `Buy (${getCardCost(card)} coins)`}
          </button>
        </div>
      </div>
    </div>
  );
}
