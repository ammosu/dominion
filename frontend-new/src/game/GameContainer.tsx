import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import { getAllCardCosts } from '../utils/cardData';
import { AITurnController } from './AITurnController';

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiController = useRef(new AITurnController());
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
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

          if (isTreasure) {
            // Treasures are played in Buy phase to add coins
            wsService.send({ type: 'PlayTreasure', card: cardName });
          } else {
            // Action cards are played in Action phase
            wsService.send({ type: 'PlayCard', card: cardName });
          }
        });

        scene.events.on('card-hover-changed', (cardName: string | null) => {
          setHoveredCard(cardName);
        });

        scene.events.on('buy-card-request', (cardName: string) => {
          console.log('Buy card request:', cardName);
          wsService.send({ type: 'BuyCard', card: cardName });
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
