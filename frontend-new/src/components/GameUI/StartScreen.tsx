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
  const [aiDifficulty, setAiDifficulty] = useState<'simple' | 'medium'>('medium');

  const handleStart = () => {
    // Connect to WebSocket with AI difficulty parameter
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
    const url = `${protocol}//${host}/ws?difficulty=${aiDifficulty}`;
    wsService.connect(url);
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

          <label className={styles.label}>
            {language === 'zh' ? 'AI 難度' : 'AI Difficulty'}
          </label>
          <select
            className={styles.select}
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(e.target.value as 'simple' | 'medium')}
          >
            <option value="simple">{language === 'zh' ? '簡單' : 'Simple'}</option>
            <option value="medium">{language === 'zh' ? '中等' : 'Medium'}</option>
          </select>

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
