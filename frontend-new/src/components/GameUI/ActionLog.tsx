import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './ActionLog.module.css';

export function ActionLog() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const logRef = useRef<HTMLDivElement>(null);

  // 自動滾動到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  if (!gameState) {
    return null;
  }

  return (
    <div className={styles.actionLog}>
      <div className={styles.header}>
        {language === 'zh' ? '遊戲記錄' : 'Action Log'}
      </div>
      <div className={styles.logContent} ref={logRef}>
        {gameState.log.length === 0 ? (
          <div className={styles.emptyLog}>
            {language === 'zh' ? '尚無記錄' : 'No actions yet'}
          </div>
        ) : (
          gameState.log.map((entry, index) => (
            <div key={index} className={styles.logEntry}>
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
