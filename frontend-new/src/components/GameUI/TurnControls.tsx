import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import { SoundManager } from '../../utils/SoundManager';
import styles from './TurnControls.module.css';

export function TurnControls() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!gameState || !currentPlayer) {
    return null;
  }

  const handleEndPhase = () => {
    wsService.send({ type: 'EndPhase' });
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    SoundManager.getInstance().setEnabled(newState);
  };

  const phaseButton = {
    Action: { zh: '結束行動階段', en: 'End Action Phase' },
    Buy: { zh: '結束購買階段', en: 'End Buy Phase' },
    Cleanup: { zh: '結束清理', en: 'End Cleanup' },
  };

  return (
    <div className={styles.turnControls}>
      <button className={styles.soundButton} onClick={toggleSound}>
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      <button className={styles.endPhaseButton} onClick={handleEndPhase}>
        {phaseButton[gameState.phase][language]}
      </button>
    </div>
  );
}
