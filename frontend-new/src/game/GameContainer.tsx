import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import { getAllCardCosts, getCardCost } from '../utils/cardData';
import { AITurnController } from './AITurnController';

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiController = useRef(new AITurnController());
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  const showToast = useUIStore((state) => state.showToast);
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new PhaserGame('phaser-container');

      // 監聽 Phaser 事件
      const scene = gameRef.current.getScene('TableScene');
      if (scene) {
        scene.events.on('play-card-request', (cardName: string) => {
          // Determine if it's a treasure or action card
          const treasures = ['Copper', 'Silver', 'Gold'];
          const isTreasure = treasures.includes(cardName);

          const state = useGameStore.getState().gameState;
          if (!state) return;

          const player = state.players[state.current_player];

          if (isTreasure) {
            // Treasures are played in Buy phase to add coins
            if (state.phase !== 'Buy') {
              showToast(
                language === 'zh' ? '只能在購買階段打出寶物卡' : 'Can only play treasures in Buy phase',
                'error'
              );
              return;
            }

            // Check if card is in hand
            if (!player.hand.includes(cardName)) {
              showToast(
                language === 'zh' ? '手牌中沒有這張卡' : 'Card not in hand',
                'error'
              );
              return;
            }

            wsService.send({ type: 'PlayTreasure', card: cardName });
            showToast(
              language === 'zh' ? `打出 ${cardName}` : `Playing ${cardName}`,
              'info'
            );
          } else {
            // Action cards are played in Action phase
            if (state.phase !== 'Action') {
              showToast(
                language === 'zh' ? '只能在行動階段打出行動卡' : 'Can only play actions in Action phase',
                'error'
              );
              return;
            }

            if (player.actions === 0) {
              showToast(
                language === 'zh' ? '沒有行動次數了' : 'No actions remaining',
                'error'
              );
              return;
            }

            if (!player.hand.includes(cardName)) {
              showToast(
                language === 'zh' ? '手牌中沒有這張卡' : 'Card not in hand',
                'error'
              );
              return;
            }

            wsService.send({ type: 'PlayCard', card: cardName });
            showToast(
              language === 'zh' ? `打出 ${cardName}` : `Playing ${cardName}`,
              'info'
            );
          }
        });

        scene.events.on('card-hover-changed', (cardName: string | null) => {
          setHoveredCard(cardName);
        });

        scene.events.on('buy-card-request', (cardName: string) => {
          console.log('Buy card request:', cardName);

          // Client-side validation
          const state = useGameStore.getState().gameState;
          if (!state) return;

          const player = state.players[state.current_player];
          const cost = getCardCost(cardName);
          const supplyCount = state.supply[cardName] || 0;

          // Check phase
          if (state.phase !== 'Buy') {
            showToast(
              language === 'zh' ? '只能在購買階段購買卡片' : 'Can only buy cards in Buy phase',
              'error'
            );
            return;
          }

          // Check buys
          if (player.buys === 0) {
            showToast(
              language === 'zh' ? '沒有購買次數了' : 'No buys remaining',
              'error'
            );
            return;
          }

          // Check coins
          if (player.coins < cost) {
            showToast(
              language === 'zh'
                ? `金幣不足！需要 ${cost}，目前只有 ${player.coins}`
                : `Not enough coins! Need ${cost}, have ${player.coins}`,
              'error'
            );
            return;
          }

          // Check supply
          if (supplyCount === 0) {
            showToast(
              language === 'zh' ? '供應區已空' : 'Supply pile empty',
              'error'
            );
            return;
          }

          // All checks passed, send buy request
          wsService.send({ type: 'BuyCard', card: cardName });
          showToast(
            language === 'zh' ? `購買 ${cardName}` : `Buying ${cardName}`,
            'success'
          );
        });

        scene.events.on('supply-card-hover-changed', (cardName: string | null) => {
          setHoveredCard(cardName);
        });
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [setHoveredCard]);

  // Sync supply with game state
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateSupply && gameState?.supply) {
      const costs = getAllCardCosts(gameState.supply);
      scene.updateSupply(gameState.supply, costs);
    }
  }, [gameState?.supply]);

  // Sync hand with game state
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateHand && gameState) {
      const currentPlayer = gameState.players[gameState.current_player];
      if (currentPlayer && currentPlayer.hand) {
        scene.updateHand(currentPlayer.hand);
      }
    }
  }, [gameState?.players, gameState?.current_player]);

  // Update language for all visible cards
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateLanguage) {
      scene.updateLanguage(language);
    }
  }, [language]);

  // Process AI turns automatically
  useEffect(() => {
    if (gameState) {
      aiController.current.checkAndProcessAITurn(gameState);
    }
  }, [gameState?.current_player, gameState?.phase]);

  // Listen for animation hints from WebSocket messages
  useEffect(() => {
    const unsubscribe = wsService.onMessage((msg) => {
      if (msg.payload.animation_hints) {
        const hint = msg.payload.animation_hints;
        const scene = gameRef.current?.getScene('TableScene');

        if (scene) {
          if (hint.type === 'draw') {
            scene.events.emit('animate-draw', hint.card);
          } else if (hint.type === 'buy') {
            // TODO: Get actual pile position from SupplyArea
            scene.events.emit('animate-buy', {
              cardName: hint.card,
              pileX: 200,
              pileY: 200,
            });
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  return <div id="phaser-container" ref={containerRef} />;
}
