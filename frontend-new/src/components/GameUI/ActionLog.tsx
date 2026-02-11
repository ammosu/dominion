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

  // Translate common phrases - order matters, more specific patterns first
  translated = translated
    .replace('Game started!', '遊戲開始！')
    .replace('Game over!', '遊戲結束！')

    // Phase transitions
    .replace(/ended Action phase/g, '結束行動階段')
    .replace(/ended Buy phase/g, '結束購買階段')
    .replace(/ended turn/g, '結束回合')
    .replace(/started turn/g, '開始回合')

    // Turn announcements
    .replace(/'s turn/g, ' 的回合')

    // Treasure playing
    .replace(/played all treasures for \+(\d+) coin\(s\)/g, '打出全部寶物，獲得 +$1 金幣')
    .replace(/played treasure for \+(\d+) coin\(s\)/g, '打出寶物，獲得 +$1 金幣')

    // Actions with quantities
    .replace(/drew (\d+) cards?/g, '抽了 $1 張牌')
    .replace(/discarded (\d+) cards?/g, '棄掉了 $1 張牌')
    .replace(/trashed (\d+) cards?/g, '移除了 $1 張牌')
    .replace(/gained (\d+) cards?/g, '獲得了 $1 張牌')

    // Resources
    .replace(/\+(\d+) actions?/g, '+$1 個行動')
    .replace(/\+(\d+) buys?/g, '+$1 次購買')
    .replace(/\+(\d+) coins?/g, '+$1 個金幣')
    .replace(/for \+(\d+) coin\(s\)/g, '獲得 +$1 金幣')

    // General actions
    .replace(/\bbought\b/g, '購買了')
    .replace(/\bplayed\b/g, '打出了')
    .replace(/\bgained\b/g, '獲得了')
    .replace(/\btrashed\b/g, '移除了')
    .replace(/\breveals?\b/g, '展示了')
    .replace(/\bdiscards?\b/g, '棄掉了')
    .replace(/\bdraws?\b/g, '抽了')
    .replace(/\bunaffected\b/g, '不受影響')

    // Card effects
    .replace(/\bto hand\b/g, '到手牌')
    .replace(/\bfrom deck\b/g, '從牌庫')
    .replace(/\bfrom discard\b/g, '從棄牌堆')
    .replace(/\bto discard\b/g, '到棄牌堆')

    // Misc
    .replace(/\bpoints?\b/g, '分')
    .replace(/\bcards?\b/g, '張牌')
    .replace(/\baction\b/g, '行動')
    .replace(/\bbuy\b/g, '購買')
    .replace(/\bcoin\b/g, '金幣');

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
