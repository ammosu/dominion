import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { getCardName, CARD_DATA } from '../../utils/cardData';
import { Player } from '../../types/game';
import styles from './PlayersSidebar.module.css';

export function PlayersSidebar() {
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);
  const [viewingDiscardPlayer, setViewingDiscardPlayer] = useState<number | null>(null);

  if (!gameState || !gameState.players || gameState.players.length === 0) return null;

  const players = gameState.players;
  const currentPlayerIndex = gameState.current_player;

  const calculateScore = (player: Player) => {
    const allCards = [...player.deck, ...player.hand, ...player.discard];
    let score = 0;
    for (const card of allCards) {
      const data = CARD_DATA[card];
      if (data?.vp !== undefined) {
        score += data.vp;
      }
    }
    return score;
  };

  const countCards = (cards: string[]) => {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      counts[card] = (counts[card] || 0) + 1;
    }
    return counts;
  };

  const getCardTypeColor = (cardName: string): string => {
    const data = CARD_DATA[cardName];
    if (!data) return '#a09888';
    switch (data.type) {
      case 'treasure': return '#c4a462';
      case 'victory': return '#6aaa6a';
      case 'action': return '#a0b8d0';
      case 'curse': return '#b080c0';
      default: return '#a09888';
    }
  };

  const getTreasureIcon = (cardName: string): string => {
    switch (cardName) {
      case 'Gold': return '🪙';
      case 'Silver': return '⚪';
      case 'Copper': return '🟤';
      default: return '';
    }
  };

  const renderPlayer = (player: Player, index: number) => {
    const isCurrentPlayer = index === currentPlayerIndex;
    const score = calculateScore(player);

    // Count treasures
    const allCards = [...player.deck, ...player.hand, ...player.discard];
    const goldCount = allCards.filter(c => c === 'Gold').length;
    const silverCount = allCards.filter(c => c === 'Silver').length;
    const copperCount = allCards.filter(c => c === 'Copper').length;

    return (
      <div
        key={index}
        className={`${styles.playerCard} ${isCurrentPlayer ? styles.active : ''}`}
      >
        <div className={styles.playerHeader}>
          <div className={styles.playerName}>
            {player.is_ai && '🤖 '}
            {player.name}
          </div>
          <div className={styles.scoreDisplay}>
            <span className={styles.scoreLabel}>
              {language === 'zh' ? '分數' : 'Score'}
            </span>
            <span className={styles.scoreValue}>{score}</span>
          </div>
        </div>

        <div className={styles.playerStats}>
          <div className={styles.statRow}>
            <span className={styles.statIcon}>🃏</span>
            <span className={styles.statLabel}>
              {language === 'zh' ? '牌庫' : 'Deck'}
            </span>
            <span className={styles.statValue}>{player.deck.length}</span>
          </div>

          <div className={styles.statRow}>
            <span className={styles.statIcon}>✋</span>
            <span className={styles.statLabel}>
              {language === 'zh' ? '手牌' : 'Hand'}
            </span>
            <span className={styles.statValue}>{player.hand.length}</span>
          </div>

          <div
            className={`${styles.statRow} ${styles.clickable}`}
            onClick={() => setViewingDiscardPlayer(index)}
          >
            <span className={styles.statIcon}>🗑️</span>
            <span className={styles.statLabel}>
              {language === 'zh' ? '棄牌' : 'Discard'}
            </span>
            <span className={styles.statValue}>{player.discard.length}</span>
          </div>
        </div>

        <div className={styles.treasures}>
          <div className={styles.treasureItem}>
            <span className={styles.treasureIcon}>🪙</span>
            <span className={styles.treasureCount}>×{goldCount}</span>
          </div>
          <div className={styles.treasureItem}>
            <span className={styles.treasureIcon}>⚪</span>
            <span className={styles.treasureCount}>×{silverCount}</span>
          </div>
          <div className={styles.treasureItem}>
            <span className={styles.treasureIcon}>🟤</span>
            <span className={styles.treasureCount}>×{copperCount}</span>
          </div>
        </div>
      </div>
    );
  };

  const viewingPlayer = viewingDiscardPlayer !== null ? players[viewingDiscardPlayer] : null;
  const discardCounts = viewingPlayer ? countCards(viewingPlayer.discard) : {};

  return (
    <>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          {language === 'zh' ? '玩家狀態' : 'Players'}
        </div>
        <div className={styles.playersContainer}>
          {players.map((player, index) => renderPlayer(player, index))}
        </div>
      </div>

      {/* Discard pile viewer modal */}
      {viewingPlayer && (
        <div className={styles.discardOverlay} onClick={() => setViewingDiscardPlayer(null)}>
          <div className={styles.discardModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.discardHeader}>
              <span>
                {viewingPlayer.name}{language === 'zh' ? ' 的棄牌堆' : "'s Discard Pile"} ({viewingPlayer.discard.length})
              </span>
              <button className={styles.closeButton} onClick={() => setViewingDiscardPlayer(null)}>✕</button>
            </div>
            <div className={styles.discardContent}>
              {Object.entries(discardCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cardName, count]) => (
                  <div
                    key={cardName}
                    className={styles.discardCard}
                    style={{ borderLeftColor: getCardTypeColor(cardName) }}
                  >
                    <span className={styles.discardCardName}>
                      {getTreasureIcon(cardName)} {getCardName(cardName, language)}
                    </span>
                    <span className={styles.discardCardCount}>×{count}</span>
                  </div>
                ))}
              {viewingPlayer.discard.length === 0 && (
                <div className={styles.emptyDiscard}>
                  {language === 'zh' ? '棄牌堆為空' : 'Discard pile is empty'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
