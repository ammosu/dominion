import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { calculateVictoryPoints } from '../../utils/cardData';
import type { Player } from '../../types/game';
import type { Rect } from '../../game/tableLayout';
import { CardListModal } from './CardListModal';
import styles from './PlayerPanel.module.css';

const ownedCards = (p: Player) => [...p.deck, ...p.hand, ...p.discard, ...p.in_play, ...p.set_aside];

/**
 * Name, score and pile sizes. The opponent's panel is a compact strip at the
 * top; ours sits beside the hand with clickable deck/discard piles.
 */
export function PlayerPanel({ playerIndex, rect, variant }: { playerIndex: number; rect: Rect; variant: 'opponent' | 'me' }) {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const [showDiscard, setShowDiscard] = useState(false);
  const player = gameState?.players[playerIndex];
  if (!gameState || !player) return null;

  const zh = language === 'zh';
  const active = gameState.current_player === playerIndex && !gameState.game_over;
  const score = calculateVictoryPoints(ownedCards(player));

  return (
    <>
      <div
        className={`${styles.panel} ${styles[variant]} ${active ? styles.active : ''}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: variant === 'opponent' ? rect.height : undefined }}
        data-testid={`player-panel-${variant}`}
      >
        <div className={styles.header}>
          <span className={styles.name}>
            {player.is_ai && '🤖 '}
            {player.name}
          </span>
          <span className={styles.score} title={zh ? '分數' : 'Score'}>{score}</span>
        </div>

        {variant === 'opponent' ? (
          <div className={styles.counts}>
            <span title={zh ? '手牌' : 'Hand'}>✋ {player.hand.length}</span>
            <span title={zh ? '牌庫' : 'Deck'}>🂠 {player.deck.length}</span>
            <span title={zh ? '棄牌堆' : 'Discard'}>♻ {player.discard.length}</span>
          </div>
        ) : (
          <div className={styles.piles}>
            <div className={styles.pile}>
              <div className={`${styles.pileCard} ${styles.deck}`}>{player.deck.length}</div>
              <span>{zh ? '牌庫' : 'Deck'}</span>
            </div>
            <button
              className={styles.pile}
              onClick={() => setShowDiscard(true)}
              disabled={player.discard.length === 0}
              data-testid="my-discard"
            >
              <div className={`${styles.pileCard} ${styles.discard}`}>{player.discard.length}</div>
              <span>{zh ? '棄牌堆' : 'Discard'}</span>
            </button>
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
