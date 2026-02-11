import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import { SoundManager } from '../../utils/SoundManager';
import { CARD_DATA } from '../../utils/cardData';
import styles from './TurnControls.module.css';

const TREASURES = ['Copper', 'Silver', 'Gold'];

export function TurnControls() {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const language = useUIStore((state) => state.language);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<{ zh: string; en: string }>({ zh: '', en: '' });

  if (!gameState || !currentPlayer) {
    return null;
  }

  const hasActionCardsInHand = () => {
    return currentPlayer.hand.some((cardName) => {
      const cardData = CARD_DATA[cardName];
      return cardData && cardData.type === 'action';
    });
  };

  const checkEndPhaseWarning = (): boolean => {
    // Action Phase warnings
    if (gameState.phase === 'Action') {
      if (currentPlayer.actions > 0 && hasActionCardsInHand()) {
        setConfirmationMessage({
          zh: `你還有 ${currentPlayer.actions} 個行動，且手中有行動卡。確定要結束行動階段嗎？`,
          en: `You still have ${currentPlayer.actions} action(s) and action cards in hand. Are you sure you want to end the Action phase?`
        });
        return true;
      }
    }

    // Buy Phase warnings
    if (gameState.phase === 'Buy') {
      if (currentPlayer.coins > 0 && currentPlayer.buys > 0) {
        setConfirmationMessage({
          zh: `你還有 ${currentPlayer.coins} 金幣和 ${currentPlayer.buys} 次購買機會。確定要結束購買階段嗎？`,
          en: `You still have ${currentPlayer.coins} coin(s) and ${currentPlayer.buys} buy(s). Are you sure you want to end the Buy phase?`
        });
        return true;
      }
    }

    return false;
  };

  const handleEndPhase = () => {
    if (checkEndPhaseWarning()) {
      setShowConfirmation(true);
    } else {
      wsService.send({ type: 'EndPhase' });
    }
  };

  const handleConfirmEndPhase = () => {
    setShowConfirmation(false);
    wsService.send({ type: 'EndPhase' });
  };

  const handleCancelEndPhase = () => {
    setShowConfirmation(false);
  };

  const handlePlayAllTreasures = () => {
    wsService.send({ type: 'PlayAllTreasures' });
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    SoundManager.getInstance().setEnabled(newState);
  };

  const phaseButton = {
    Action: { zh: '結束行動階段 ⏭', en: 'End Action Phase ⏭' },
    Buy: { zh: '結束購買階段 ⏭', en: 'End Buy Phase ⏭' },
    Cleanup: { zh: '結束清理', en: 'End Cleanup' },
  };

  const hasTreasuresInHand = currentPlayer.hand.some((c) => TREASURES.includes(c));
  const showPlayAllTreasures = gameState.phase === 'Buy' && hasTreasuresInHand;

  return (
    <>
      <div className={styles.turnControls}>
        <button className={styles.soundButton} onClick={toggleSound}>
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        {showPlayAllTreasures && (
          <button
            className={styles.playAllTreasuresButton}
            onClick={handlePlayAllTreasures}
            data-testid="play-all-treasures"
          >
            {language === 'zh' ? '💰 打出全部寶物' : '💰 Play All Treasures'}
          </button>
        )}
        <button
          className={styles.endPhaseButton}
          onClick={handleEndPhase}
          data-testid="end-phase"
        >
          {phaseButton[gameState.phase][language]}
        </button>
      </div>

      {showConfirmation && (
        <div className={styles.confirmationOverlay} onClick={handleCancelEndPhase}>
          <div className={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmationHeader}>
              {language === 'zh' ? '⚠️ 確認結束階段' : '⚠️ Confirm End Phase'}
            </div>
            <div className={styles.confirmationMessage}>
              {confirmationMessage[language]}
            </div>
            <div className={styles.confirmationButtons}>
              <button
                className={styles.confirmButton}
                onClick={handleConfirmEndPhase}
              >
                {language === 'zh' ? '確定結束' : 'Confirm'}
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleCancelEndPhase}
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
