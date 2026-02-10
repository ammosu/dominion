import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  if (!gameState || !currentPlayer) {
    return (
      <div className={styles.topBar}>
        <span>等待遊戲開始...</span>
      </div>
    );
  }

  const phaseText = {
    Action: { zh: '行動階段', en: 'Action Phase' },
    Buy: { zh: '購買階段', en: 'Buy Phase' },
    Cleanup: { zh: '清理階段', en: 'Cleanup Phase' },
  };

  return (
    <div className={styles.topBar}>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>
          {language === 'zh' ? '當前玩家：' : 'Current Player: '}
          {currentPlayer.name}
        </span>
        <span className={styles.phaseBadge}>
          {phaseText[gameState.phase][language]}
        </span>
      </div>

      <div className={styles.counters}>
        <span className={styles.counter}>
          {language === 'zh' ? '行動' : 'Actions'}: {currentPlayer.actions}
        </span>
        <span className={styles.counter}>
          {language === 'zh' ? '購買' : 'Buys'}: {currentPlayer.buys}
        </span>
        <span className={styles.counter}>
          {language === 'zh' ? '金幣' : 'Coins'}: {currentPlayer.coins}
        </span>
        <button className={styles.langButton} onClick={toggleLanguage}>
          {language === 'zh' ? 'EN' : '中文'}
        </button>
      </div>
    </div>
  );
}
