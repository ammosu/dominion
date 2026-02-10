import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import styles from './StartScreen.module.css';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const [playerName, setPlayerName] = useState('Alice');

  const handleStart = () => {
    // Send start game request to backend
    wsService.send({
      type: 'StartGame',
      payload: { playerName },
    });
    onStart();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          {language === 'zh' ? '皇輿爭霸' : 'Dominion'}
        </h1>

        <div className={styles.form}>
          <label className={styles.label}>
            {language === 'zh' ? '玩家名稱' : 'Player Name'}
          </label>
          <input
            type="text"
            className={styles.input}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />

          <button className={styles.startButton} onClick={handleStart}>
            {language === 'zh' ? '開始遊戲' : 'Start Game'}
          </button>

          <button
            className={styles.langButton}
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          >
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>
      </div>
    </div>
  );
}
