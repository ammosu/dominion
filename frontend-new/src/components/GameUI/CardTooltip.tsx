import { useUIStore } from '../../store/uiStore';
import { CARD_DATA, getCardName } from '../../utils/cardData';
import styles from './CardTooltip.module.css';

export function CardTooltip() {
  const hoveredCard = useUIStore((state) => state.hoveredCard);
  const language = useUIStore((state) => state.language);

  if (!hoveredCard) return null;

  const data = CARD_DATA[hoveredCard];
  if (!data) return null;

  const typeLabels: Record<string, { zh: string; en: string }> = {
    treasure: { zh: '寶物牌', en: 'Treasure' },
    victory: { zh: '勝利牌', en: 'Victory' },
    action: { zh: '行動牌', en: 'Action' },
    curse: { zh: '詛咒牌', en: 'Curse' },
  };

  const typeColors: Record<string, string> = {
    treasure: '#ffd700',
    victory: '#4caf50',
    action: '#90caf9',
    curse: '#ce93d8',
  };

  return (
    <div className={styles.tooltip} data-testid="card-tooltip">
      <div className={styles.header}>
        <span className={styles.name}>{getCardName(hoveredCard, language)}</span>
        <span
          className={styles.typeBadge}
          style={{ backgroundColor: typeColors[data.type] }}
        >
          {typeLabels[data.type][language]}
        </span>
        <span className={styles.cost}>
          {language === 'zh' ? `費用: ${data.cost}` : `Cost: ${data.cost}`}
        </span>
      </div>
      {data.desc && (
        <div className={styles.desc}>{data.desc[language]}</div>
      )}
      {data.tooltip && (
        <div className={styles.detail}>{data.tooltip[language]}</div>
      )}
      {data.coins !== undefined && (
        <div className={styles.stat}>
          💰 {language === 'zh' ? `提供 ${data.coins} 金幣` : `Provides ${data.coins} coin(s)`}
        </div>
      )}
      {data.vp !== undefined && (
        <div className={styles.stat}>
          {data.vp >= 0 ? '⭐' : '💀'} {language === 'zh' ? `${data.vp} 分` : `${data.vp} VP`}
        </div>
      )}
    </div>
  );
}
