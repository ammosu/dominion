import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CARD_DATA, getCardName } from '../../utils/cardData';
import styles from './ActionLog.module.css';

const CARD_NAMES = Object.keys(CARD_DATA);

function translateLogEntry(entry: string, lang: 'en' | 'zh'): string {
  if (lang === 'en') return entry;

  let translated = entry;

  // Replace card names with Chinese equivalents
  for (const cardName of CARD_NAMES) {
    const zhName = getCardName(cardName, 'zh');
    // Use word boundary-like matching to avoid partial replacements
    translated = translated.replace(new RegExp(`\\b${cardName}\\b`, 'g'), zhName);
  }

  // Translate common phrases
  translated = translated
    .replace('Game started!', '遊戲開始！')
    .replace('Game over!', '遊戲結束！')
    .replace(/(\w+) ended Action phase/g, '$1 結束行動階段')
    .replace(/(\w+) ended turn/g, '$1 結束回合')
    .replace(/(\w+)'s turn/g, '$1 的回合')
    .replace(/played all treasures for \+(\d+) coin\(s\)/g, '打出全部寶物，+$1 金幣')
    .replace(/bought/g, '購買了')
    .replace(/played/g, '打出了')
    .replace(/drew (\d+) cards?/g, '抽了 $1 張牌')
    .replace(/drew (\d+) card/g, '抽了 $1 張牌')
    .replace(/\+(\d+) actions?/g, '+$1 行動')
    .replace(/\+(\d+) buys?/g, '+$1 購買')
    .replace(/\+(\d+) coins?/g, '+$1 金幣')
    .replace(/for \+(\d+) coin\(s\)/g, '獲得 +$1 金幣')
    .replace(/discarded (\d+)/g, '棄掉了 $1 張')
    .replace(/gained/g, '獲得了')
    .replace(/trashed/g, '移除了')
    .replace(/reveals/g, '展示了')
    .replace(/unaffected/g, '不受影響')
    .replace(/discards/g, '棄掉了')
    .replace(/points/g, '分');

  return translated;
}

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
              {translateLogEntry(entry, language)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
