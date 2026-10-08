import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import {
  ART_STYLES,
  BASE_CARDS,
  type ArtStyle,
  CARD_DATA,
  KINGDOM_PRESETS,
  compareByCost,
  getCardCost,
  getCardName,
} from '../../utils/cardData';
import styles from './StartScreen.module.css';

interface StartScreenProps {
  onStart: () => void;
}

const ALL_KINGDOM_CARDS = Object.keys(CARD_DATA).filter((card) => !BASE_CARDS.includes(card));

function randomKingdom(): string[] {
  const pool = [...ALL_KINGDOM_CARDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 10).sort(compareByCost);
}

export function StartScreen({ onStart }: StartScreenProps) {
  const language = useUIStore((state) => state.language);
  const setLanguage = useUIStore((state) => state.setLanguage);
  const artStyle = useUIStore((state) => state.artStyle);
  const setArtStyle = useUIStore((state) => state.setArtStyle);
  const [playerName, setPlayerName] = useState('Alice');
  const [aiDifficulty, setAiDifficulty] = useState<'simple' | 'medium'>('medium');
  const [kingdomId, setKingdomId] = useState('first-game');
  const [randomCards, setRandomCards] = useState<string[]>(randomKingdom);

  const kingdomCards =
    kingdomId === 'random'
      ? randomCards
      : [...(KINGDOM_PRESETS.find((preset) => preset.id === kingdomId)?.cards ?? [])].sort(compareByCost);

  const handleStart = () => {
    // Same-origin /ws: proxied to the backend by Vite (dev) or nginx (Docker)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const params = new URLSearchParams({
      difficulty: aiDifficulty,
      kingdom: kingdomId === 'random' ? randomCards.join(',') : kingdomId,
      name: playerName.trim() || 'Alice',
    });
    wsService.connect(`${protocol}//${host}/ws?${params}`);
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

          <label className={styles.label}>
            {language === 'zh' ? '王國牌組' : 'Kingdom'}
          </label>
          <div className={styles.kingdomRow}>
            <select
              className={styles.select}
              value={kingdomId}
              onChange={(e) => setKingdomId(e.target.value)}
              data-testid="kingdom-select"
            >
              {KINGDOM_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name[language]}
                </option>
              ))}
              <option value="random">{language === 'zh' ? '隨機 10 張' : 'Random 10'}</option>
            </select>
            {kingdomId === 'random' && (
              <button
                className={styles.rerollButton}
                onClick={() => setRandomCards(randomKingdom())}
                title={language === 'zh' ? '重新抽選' : 'Reroll'}
              >
                🎲
              </button>
            )}
          </div>
          <div className={styles.kingdomPreview} data-testid="kingdom-preview">
            {kingdomCards.map((card) => (
              <span key={card} className={styles.kingdomChip}>
                <span className={styles.kingdomCost}>{getCardCost(card)}</span>
                {getCardName(card, language)}
              </span>
            ))}
          </div>

          <label className={styles.label}>
            {language === 'zh' ? '插圖風格' : 'Art Style'}
          </label>
          <select
            className={styles.select}
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value as ArtStyle)}
          >
            {ART_STYLES.map((style) => (
              <option key={style.id} value={style.id}>{style.name[language]}</option>
            ))}
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
