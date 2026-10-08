import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import { isAction, isTreasure } from '../../utils/cardData';
import { decisionPrompt, isYesNoDecision } from '../../utils/i18n';
import type { Rect } from '../../game/tableLayout';
import styles from './StatusBar.module.css';

/**
 * Actions | Buys | Coins of the player whose turn it is, a one-line prompt,
 * the turn buttons, and inline Yes/No answers for simple decisions.
 */
export function StatusBar({ rect }: { rect: Rect }) {
  const gameState = useGameStore((state) => state.gameState);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const me = useGameStore((state) => state.viewerPlayer);
  const canAct = useGameStore((state) => state.canAct);
  const myDecision = useGameStore((state) => state.myDecision);
  const language = useUIStore((state) => state.language);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (!gameState || !currentPlayer || !me) return null;
  const zh = language === 'zh';

  const endPhase = () => {
    setConfirmation(null);
    wsService.send({ type: 'EndPhase' });
  };

  const requestEndPhase = () => {
    if (gameState.phase === 'Action' && me.actions > 0 && me.hand.some(isAction)) {
      setConfirmation(
        zh
          ? `你還有 ${me.actions} 個行動，且手中有行動卡。確定要結束行動階段嗎？`
          : `You still have ${me.actions} action(s) and action cards in hand. End the Action phase?`,
      );
    } else if (gameState.phase === 'Buy' && me.coins > 0 && me.buys > 0) {
      setConfirmation(
        zh
          ? `你還有 ${me.coins} 金幣和 ${me.buys} 次購買。確定要結束回合嗎？`
          : `You still have ${me.coins} coin(s) and ${me.buys} buy(s). End your turn?`,
      );
    } else {
      endPhase();
    }
  };

  const prompt = (() => {
    if (gameState.game_over) return zh ? '遊戲結束' : 'Game over';
    if (myDecision) {
      return isYesNoDecision(myDecision)
        ? decisionPrompt(myDecision, language)
        : zh ? '請在視窗中完成選擇' : 'Make your choice in the dialog';
    }
    if (!canAct) {
      return (
        <>
          {zh ? '等待 ' : 'Waiting for '}
          <span className={styles.promptName}>{currentPlayer.name}</span>…
        </>
      );
    }
    const treasures = !gameState.turn.has_bought && me.hand.some(isTreasure);
    if (gameState.phase === 'Action') {
      if (me.actions > 0 && me.hand.some(isAction)) {
        return zh ? '點擊手牌中發光的行動卡打出' : 'Click a highlighted Action card to play it';
      }
      return zh ? '沒有可打的行動卡，進入購買階段' : 'No Action to play — go to the Buy phase';
    }
    if (treasures) return zh ? '打出寶物，再點擊發光的供應堆購買' : 'Play Treasures, then click a highlighted pile to buy';
    if (me.buys > 0 && me.coins > 0) return zh ? '點擊發光的供應堆購買' : 'Click a highlighted pile to buy';
    return zh ? '購買完畢就結束回合' : 'Done buying? End your turn';
  })();

  const showTreasures = canAct && gameState.phase === 'Buy' && !gameState.turn.has_bought && me.hand.some(isTreasure);
  const yesNo = myDecision && isYesNoDecision(myDecision) ? myDecision : null;

  return (
    <>
      <div
        className={styles.statusBar}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        data-testid="status-bar"
      >
        <div className={styles.statusMain}>
          <div className={styles.counters}>
            <span>{currentPlayer.actions} {zh ? '行動' : 'Actions'}</span>
            <span className={styles.divider}>|</span>
            <span>{currentPlayer.buys} {zh ? '購買' : 'Buys'}</span>
            <span className={styles.divider}>|</span>
            <span className={styles.coin}>{currentPlayer.coins}</span>
            <span className={styles.phase}>
              {gameState.phase === 'Action' ? (zh ? '行動階段' : 'Action phase') : zh ? '購買階段' : 'Buy phase'}
            </span>
          </div>
          <div className={styles.prompt} data-testid="status-prompt">{prompt}</div>
        </div>

        <div className={styles.actions}>
          {yesNo && (
            <>
              <button className={styles.cancelButton} onClick={() => wsService.send({ type: 'Resolve', cards: [] })} data-testid="decision-no">
                {zh ? '不要' : 'No'}
              </button>
              <button className={styles.endPhaseButton} onClick={() => wsService.send({ type: 'Resolve', cards: yesNo.options })} data-testid="decision-yes">
                {zh ? '是' : 'Yes'}
              </button>
            </>
          )}
          {showTreasures && (
            <button
              className={styles.playAllTreasuresButton}
              onClick={() => wsService.send({ type: 'PlayAllTreasures' })}
              data-testid="play-all-treasures"
            >
              {zh ? '💰 打出全部寶物' : '💰 Play All Treasures'}
            </button>
          )}
          {canAct && (
            <button className={styles.endPhaseButton} onClick={requestEndPhase} data-testid="end-phase">
              {gameState.phase === 'Action'
                ? zh ? '結束行動階段 ⏭' : 'End Actions ⏭'
                : zh ? '結束回合 ⏭' : 'End Turn ⏭'}
            </button>
          )}
        </div>
      </div>

      {confirmation && (
        <div className={styles.confirmationOverlay} onClick={() => setConfirmation(null)}>
          <div className={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmationHeader}>{zh ? '⚠️ 確認結束' : '⚠️ Confirm'}</div>
            <div className={styles.confirmationMessage}>{confirmation}</div>
            <div className={styles.confirmationButtons}>
              <button className={styles.confirmButton} onClick={endPhase}>
                {zh ? '確定結束' : 'Confirm'}
              </button>
              <button className={styles.cancelButton} onClick={() => setConfirmation(null)}>
                {zh ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
