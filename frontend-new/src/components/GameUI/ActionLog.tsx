import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { translateLogEntry } from '../../utils/i18n';
import styles from './ActionLog.module.css';

export function ActionLog() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const logRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // 自動滾動到底部
  useEffect(() => {
    if (logRef.current && isExpanded) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log, isExpanded]);

  if (!gameState) {
    return null;
  }

  const recentEventCount = Math.min(gameState.log.length, 99);

  return (
    <div className={`${styles.actionLog} ${isExpanded ? styles.expanded : styles.minimized}`}>
      <div
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={styles.headerTitle}>
          {language === 'zh' ? '遊戲記錄' : 'Action Log'}
        </span>
        {!isExpanded && recentEventCount > 0 && (
          <span className={styles.badge}>{recentEventCount}</span>
        )}
        <span className={styles.toggleIcon}>
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>
      {isExpanded && (
        <div className={styles.logContent} ref={logRef}>
          {gameState.log.length === 0 ? (
            <div className={styles.emptyLog}>
              {language === 'zh' ? '尚無記錄' : 'No actions yet'}
            </div>
          ) : (
            gameState.log.map((entry, index) => (
              <div key={index} className={styles.logEntry}>
                {translateLogEntry(entry, language)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
