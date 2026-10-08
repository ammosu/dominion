import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CARD_DATA, getCardFrameStyle } from '../../utils/cardData';
import { translateLogEntry } from '../../utils/i18n';
import { SoundManager } from '../../utils/SoundManager';
import styles from './ActionLog.module.css';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CARD_TEXT_COLORS: Record<string, string> = {
  treasure: '#f2c94c',
  victory: '#8cc084',
  curse: '#c39be0',
  reaction: '#8fb5df',
};

/** Right-hand column: title, language/sound toggles and the full game log. */
export function ActionLog() {
  const gameState = useGameStore((state) => state.gameState);
  const viewer = useGameStore((state) => state.viewer);
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const [soundOn, setSoundOn] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [gameState?.log]);

  const players = gameState?.players ?? [];
  const tokenColors = useMemo(() => {
    const colors = new Map<string, string>();
    Object.keys(CARD_DATA).forEach((id) => {
      const data = CARD_DATA[id];
      const kind = data.subtypes?.includes('reaction') ? 'reaction' : data.type;
      colors.set(data.name[language], CARD_TEXT_COLORS[kind] ?? '#f0e6d0');
    });
    players.forEach((p, i) => colors.set(p.name, i === viewer ? '#7fb3ff' : '#ff8a7a'));
    return colors;
  }, [language, players.map((p) => p.name).join(), viewer]);

  const pattern = useMemo(
    () => new RegExp(`(${[...tokenColors.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})`, 'g'),
    [tokenColors],
  );

  const render = (entry: string): ReactNode[] =>
    translateLogEntry(entry, language)
      .split(pattern)
      .map((part, i) =>
        tokenColors.has(part) ? (
          <span key={i} style={{ color: tokenColors.get(part), fontWeight: 600 }}>{part}</span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      );

  const toggleSound = () => {
    SoundManager.getInstance().setEnabled(!soundOn);
    setSoundOn(!soundOn);
  };

  const zh = language === 'zh';
  const isTurnLine = (entry: string) => entry.endsWith("'s turn");

  return (
    <aside className={styles.side} data-testid="side-panel">
      <div className={styles.header}>
        <span className={styles.title}>{zh ? '皇輿爭霸' : 'Dominion'}</span>
        <button className={styles.iconButton} onClick={toggleSound} title={zh ? '音效' : 'Sound'}>
          {soundOn ? '🔊' : '🔇'}
        </button>
        <button className={styles.iconButton} onClick={() => setLanguage(zh ? 'en' : 'zh')}>
          {zh ? 'EN' : '中文'}
        </button>
      </div>
      {gameState && (
        <div className={styles.kingdom} title={zh ? '本局王國牌' : 'Kingdom'}>
          {gameState.kingdom.map((card) => (
            <span key={card} style={{ borderColor: getCardFrameStyle(card).color }}>
              {CARD_DATA[card]?.name[language] ?? card}
            </span>
          ))}
        </div>
      )}
      <div className={styles.logContent} ref={logRef}>
        {gameState?.log.map((entry, index) => (
          <div key={index} className={isTurnLine(entry) ? styles.turnLine : styles.logEntry}>
            {render(entry)}
          </div>
        ))}
      </div>
    </aside>
  );
}
