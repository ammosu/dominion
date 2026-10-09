import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useFxStore } from '../../fx/fxStore';
import { useUIStore } from '../../store/uiStore';
import { wsService } from '../../services/websocket';
import { getCardCost, isAction, isTreasure } from '../../utils/cardData';
import { decisionPrompt, isYesNoDecision } from '../../utils/i18n';
import type { Rect } from '../../game/tableLayout';
import styles from './StatusBar.module.css';

/**
 * A counter that pulses and floats its change ("+2", "−1") when `value`
 * changes within the same turn (`turnKey`); a new turn resets silently.
 */
function Stat({ value, turnKey, className, fx, children }: { value: number; turnKey: string; className?: string; fx?: string; children: ReactNode }) {
  const previous = useRef({ value, turnKey });
  const changes = useRef(0);
  const [change, setChange] = useState<{ delta: number; id: number } | null>(null);

  useEffect(() => {
    const before = previous.current;
    if (before.turnKey === turnKey && before.value !== value) {
      setChange({ delta: value - before.value, id: ++changes.current });
    } else if (before.turnKey !== turnKey) {
      setChange(null);
    }
    previous.current = { value, turnKey };
  }, [value, turnKey]);

  return (
    <span className={styles.stat} data-fx={fx}>
      <span key={change?.id ?? 0} className={`${className ?? ''} ${change ? styles.pulse : ''}`}>{children}</span>
      {change && (
        <span
          key={`d${change.id}`}
          className={`${styles.delta} ${change.delta > 0 ? styles.up : styles.down}`}
          onAnimationEnd={() => setChange(null)}
          aria-hidden
        >
          {change.delta > 0 ? '+' : '−'}
          {Math.abs(change.delta)}
        </span>
      )}
    </span>
  );
}

/**
 * Actions | Buys | Coins of the player whose turn it is, a one-line prompt,
 * the turn buttons, and inline Yes/No answers for simple decisions.
 */
export function StatusBar({ rect, onOpenLog, logUnread = false }: { rect: Rect; onOpenLog?: () => void; logUnread?: boolean }) {
  const gameState = useGameStore((state) => state.gameState);
  const me = useGameStore((state) => state.viewerPlayer);
  // While another player's moves are replayed, show them as acting and wait.
  const replaying = useFxStore((state) => state.busy);
  const replayActor = useFxStore((state) => state.actor);
  const currentPlayer = useGameStore((state) =>
    replaying && replayActor !== null ? state.gameState?.players[replayActor] ?? null : state.currentPlayer,
  );
  const canAct = useGameStore((state) => state.canAct) && !replaying;
  const myDecision = useGameStore((state) => (replaying ? null : state.myDecision));
  const language = useUIStore((state) => state.language);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (!gameState || !currentPlayer || !me) return null;
  const zh = language === 'zh';

  // Something other than a 0-cost card (Copper, Curse) is affordable.
  const worthBuying =
    me.buys > 0 &&
    Object.entries(gameState.supply).some(([card, count]) => count > 0 && getCardCost(card) > 0 && getCardCost(card) <= me.coins);

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
    } else if (gameState.phase === 'Buy' && worthBuying) {
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
      return currentPlayer.is_ai ? (
        <>
          <span className={styles.promptName}>{currentPlayer.name}</span>
          {zh ? ' 行動中' : ' is playing'}
          <span className={styles.thinking} aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </>
      ) : (
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
    if (worthBuying) return zh ? '點擊發光的供應堆購買' : 'Click a highlighted pile to buy';
    return zh ? '購買完畢就結束回合' : 'Done buying? End your turn';
  })();

  const turnKey = `${currentPlayer.name}-${currentPlayer.turns_taken}`;
  // Nothing left to play: the Action-phase button just moves on to buying.
  const actionsDone = me.actions === 0 || !me.hand.some(isAction);
  const variant = rect.width < 560 ? styles.stacked : rect.height < 56 ? styles.compact : '';
  const showTreasures = canAct && gameState.phase === 'Buy' && !gameState.turn.has_bought && me.hand.some(isTreasure);
  const yesNo = myDecision && isYesNoDecision(myDecision) ? myDecision : null;
  // When only one move makes sense, make its button glow: no Action to play
  // → go to Buy; nothing worth buying → play Treasures if any, else end the turn.
  const suggested = !canAct || myDecision
    ? null
    : gameState.phase === 'Action'
      ? actionsDone ? 'end' : null
      : worthBuying ? null : showTreasures ? 'treasures' : 'end';

  return (
    <>
      <div
        className={`${styles.statusBar} ${variant}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        data-testid="status-bar"
      >
        <div className={styles.statusMain}>
          <div className={styles.counters}>
            <Stat value={currentPlayer.actions} turnKey={turnKey} fx="actions">
              {currentPlayer.actions} {zh ? '行動' : 'Actions'}
            </Stat>
            <span className={styles.divider}>|</span>
            <Stat value={currentPlayer.buys} turnKey={turnKey} fx="buys">
              {currentPlayer.buys} {zh ? '購買' : 'Buys'}
            </Stat>
            <span className={styles.divider}>|</span>
            <Stat value={currentPlayer.coins} turnKey={turnKey} className={styles.coin} fx="coins">
              {currentPlayer.coins}
            </Stat>
            <span className={styles.phase}>
              {gameState.phase === 'Action' ? (zh ? '行動階段' : 'Action phase') : zh ? '購買階段' : 'Buy phase'}
            </span>
            {onOpenLog && (
              <button className={styles.logButton} onClick={onOpenLog} data-testid="open-log">
                {zh ? '☰ 紀錄' : '☰ Log'}
                {logUnread && <span className={styles.unread} />}
              </button>
            )}
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
              className={`${styles.playAllTreasuresButton} ${suggested === 'treasures' ? styles.suggested : ''}`}
              onClick={() => wsService.send({ type: 'PlayAllTreasures' })}
              data-testid="play-all-treasures"
            >
              {zh ? '💰 打出全部寶物' : '💰 Play All Treasures'}
            </button>
          )}
          {canAct && (
            <button
              className={`${styles.endPhaseButton} ${suggested === 'end' ? styles.suggested : ''}`}
              onClick={requestEndPhase}
              data-testid="end-phase"
            >
              {gameState.phase === 'Action'
                ? actionsDone
                  ? zh ? '進入購買階段 ⏭' : 'To Buy phase ⏭'
                  : zh ? '結束行動階段 ⏭' : 'End Actions ⏭'
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
