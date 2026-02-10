import { useUIStore } from '../../store/uiStore';
import styles from './GameOverModal.module.css';

interface GameOverModalProps {
  scores: { name: string; score: number }[];
  onClose: () => void;
}

export function GameOverModal({ scores, onClose }: GameOverModalProps) {
  const language = useUIStore((state) => state.language);

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h1 className={styles.title}>
          {language === 'zh' ? '遊戲結束' : 'Game Over'}
        </h1>

        <div className={styles.winner}>
          <span className={styles.crown}>👑</span>
          <h2>{winner.name}</h2>
          <p>
            {language === 'zh' ? '獲勝！' : 'Wins!'}
          </p>
        </div>

        <div className={styles.scores}>
          <h3>{language === 'zh' ? '最終分數' : 'Final Scores'}</h3>
          {sorted.map((player, index) => (
            <div key={player.name} className={styles.scoreRow}>
              <span className={styles.rank}>#{index + 1}</span>
              <span className={styles.playerName}>{player.name}</span>
              <span className={styles.score}>{player.score}</span>
            </div>
          ))}
        </div>

        <button className={styles.closeButton} onClick={onClose}>
          {language === 'zh' ? '關閉' : 'Close'}
        </button>
      </div>
    </div>
  );
}
