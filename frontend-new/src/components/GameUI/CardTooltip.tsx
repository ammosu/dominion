import { useEffect, useState, type CSSProperties } from 'react';
import { useUIStore } from '../../store/uiStore';
import { CARD_DATA, getCardArtPath, getCardName } from '../../utils/cardData';
import styles from './CardTooltip.module.css';

export function CardTooltip() {
  const hoveredCard = useUIStore((state) => state.hoveredCard);
  const language = useUIStore((state) => state.language);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const nextSide = event.clientX < window.innerWidth / 2 ? 'right' : 'left';
      setDockSide((currentSide) => currentSide === nextSide ? currentSide : nextSide);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

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

  const artworkPath = getCardArtPath(hoveredCard);
  const displayName = getCardName(hoveredCard, language);
  const accentStyle = {
    '--card-accent': typeColors[data.type],
  } as CSSProperties;

  return (
    <aside
      className={`${styles.preview} ${dockSide === 'right' ? styles.dockRight : styles.dockLeft}`}
      style={accentStyle}
      data-testid="card-tooltip"
      role="tooltip"
      aria-label={`${displayName} ${typeLabels[data.type][language]}`}
    >
      <div className={styles.artworkFrame}>
        {artworkPath ? (
          <img
            className={styles.artwork}
            src={artworkPath}
            alt=""
            draggable={false}
          />
        ) : (
          <div className={styles.artworkFallback} aria-hidden="true" />
        )}
        <div className={styles.artworkShade} />
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.name}>{displayName}</span>
            <span className={styles.typeBadge}>
              {typeLabels[data.type][language]}
            </span>
          </div>
          <span className={styles.cost} aria-label={language === 'zh' ? `費用 ${data.cost}` : `Cost ${data.cost}`}>
            <span className={styles.costLabel}>{language === 'zh' ? '費用' : 'COST'}</span>
            <strong>{data.cost}</strong>
          </span>
        </div>
      </div>

      <div className={styles.infoPanel}>
        {data.desc && <div className={styles.desc}>{data.desc[language]}</div>}
        {data.coins !== undefined && (
          <div className={styles.stat}>
            <span aria-hidden="true">◆</span>
            {language === 'zh' ? `提供 ${data.coins} 金幣` : `Provides ${data.coins} coin(s)`}
          </div>
        )}
        {data.vp !== undefined && (
          <div className={styles.stat}>
            <span aria-hidden="true">{data.vp >= 0 ? '★' : '✦'}</span>
            {language === 'zh' ? `${data.vp} 勝利分` : `${data.vp} victory point(s)`}
          </div>
        )}
        {data.tooltip && <div className={styles.detail}>{data.tooltip[language]}</div>}
      </div>
    </aside>
  );
}
