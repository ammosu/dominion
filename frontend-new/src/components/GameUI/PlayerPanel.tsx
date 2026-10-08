import { useState, type ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useFxStore } from '../../fx/fxStore';
import { useUIStore } from '../../store/uiStore';
import { calculateVictoryPoints } from '../../utils/cardData';
import type { Player } from '../../types/game';
import type { Rect } from '../../game/tableLayout';
import { CardListModal } from './CardListModal';
import { CARD_BACK_URL } from '../../fx/art';
import styles from './PlayerPanel.module.css';

const ownedCards = (p: Player) => [...p.deck, ...p.hand, ...p.discard, ...p.in_play, ...p.set_aside];

/**
 * Name, score and pile sizes. The opponent's panel is a compact strip at the
 * top; ours sits beside the hand with clickable deck/discard piles, or is a
 * strip too when there is no room for them (phones).
 */
export function PlayerPanel({ playerIndex, rect, variant }: { playerIndex: number; rect: Rect; variant: 'opponent' | 'me' }) {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const [showDiscard, setShowDiscard] = useState(false);
  // While another player's turn is replayed, light up whoever is shown acting.
  const replayActor = useFxStore((state) => state.actor);
  const player = gameState?.players[playerIndex];
  if (!gameState || !player) return null;

  const zh = language === 'zh';
  const active = (replayActor ?? gameState.current_player) === playerIndex && !gameState.game_over;
  const score = calculateVictoryPoints(ownedCards(player));
  const strip = variant === 'opponent' || rect.height < 130;
  const discardButton = (content: ReactNode, className?: string) => (
    <button
      className={className}
      onClick={() => setShowDiscard(true)}
      disabled={player.discard.length === 0}
      title={zh ? '棄牌堆' : 'Discard'}
      data-testid="my-discard"
      data-fx={`discard-${playerIndex}`}
    >
      {content}
    </button>
  );

  return (
    <>
      <div
        className={`${styles.panel} ${strip ? styles.strip : styles.full} ${strip && rect.width < 240 ? styles.small : ''} ${active ? styles.active : ''}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: strip ? rect.height : undefined }}
        data-testid={`player-panel-${variant}`}
        data-fx={`panel-${playerIndex}`}
      >
        <div className={styles.header}>
          <span className={styles.name}>
            {player.is_ai && '🤖 '}
            {player.name}
          </span>
          <span className={styles.score} title={zh ? '分數' : 'Score'}>{score}</span>
        </div>

        {strip ? (
          <div className={styles.counts}>
            {variant === 'opponent' && <span title={zh ? '手牌' : 'Hand'} data-fx={`hand-${playerIndex}`}>✋ {player.hand.length}</span>}
            <span title={zh ? '牌庫' : 'Deck'} data-fx={`deck-${playerIndex}`}>🂠 {player.deck.length}</span>
            {variant === 'opponent' ? (
              <span title={zh ? '棄牌堆' : 'Discard'} data-fx={`discard-${playerIndex}`}>♻ {player.discard.length}</span>
            ) : (
              discardButton(<>♻ {player.discard.length}</>, styles.countButton)
            )}
          </div>
        ) : (
          <div className={styles.piles}>
            <div className={styles.pile}>
              <div
                className={`${styles.pileCard} ${styles.deck}`}
                style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("${CARD_BACK_URL}")` }}
                data-fx={`deck-${playerIndex}`}
              >
                {player.deck.length}
              </div>
              <span>{zh ? '牌庫' : 'Deck'}</span>
            </div>
            {discardButton(
              <>
                <div className={`${styles.pileCard} ${styles.discard}`}>{player.discard.length}</div>
                <span>{zh ? '棄牌堆' : 'Discard'}</span>
              </>,
              styles.pile,
            )}
          </div>
        )}
      </div>

      {showDiscard && (
        <CardListModal
          title={zh ? '棄牌堆' : 'Discard pile'}
          cards={player.discard}
          onClose={() => setShowDiscard(false)}
        />
      )}
    </>
  );
}
