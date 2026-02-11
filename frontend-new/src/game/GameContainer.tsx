import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import { getAllCardCosts, getCardCost } from '../utils/cardData';
import { AITurnController } from './AITurnController';

const COMPLEX_ACTIONS = ['Cellar', 'Workshop', 'Militia', 'Mine', 'Remodel'];
const TREASURES = ['Copper', 'Silver', 'Gold'];

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiController = useRef(new AITurnController());
  const gameState = useGameStore((state) => state.gameState);
  const language = useUIStore((state) => state.language);

  const setupSceneListeners = (scene: Phaser.Scene) => {
    // Remove any existing listeners first to avoid duplicates
    scene.events.off('play-card-request');
    scene.events.off('card-hover-changed');
    scene.events.off('buy-card-request');
    scene.events.off('supply-card-hover-changed');

    scene.events.on('play-card-request', (cardName: string) => {
          const isTreasure = TREASURES.includes(cardName);
          const state = useGameStore.getState().gameState;
          if (!state) return;

          const lang = useUIStore.getState().language;
          const player = state.players[state.current_player];

          if (isTreasure) {
            if (state.phase !== 'Buy') {
              useUIStore.getState().showToast(
                lang === 'zh' ? '只能在購買階段打出寶物卡' : 'Can only play treasures in Buy phase',
                'error'
              );
              return;
            }
            if (!player.hand.includes(cardName)) {
              useUIStore.getState().showToast(
                lang === 'zh' ? '手牌中沒有這張卡' : 'Card not in hand',
                'error'
              );
              return;
            }
            wsService.send({ type: 'PlayTreasure', card: cardName });
          } else {
            // Action card
            if (state.phase !== 'Action') {
              useUIStore.getState().showToast(
                lang === 'zh' ? '只能在行動階段打出行動卡' : 'Can only play actions in Action phase',
                'error'
              );
              return;
            }
            if (player.actions === 0) {
              useUIStore.getState().showToast(
                lang === 'zh' ? '沒有行動次數了' : 'No actions remaining',
                'error'
              );
              return;
            }
            if (!player.hand.includes(cardName)) {
              useUIStore.getState().showToast(
                lang === 'zh' ? '手牌中沒有這張卡' : 'Card not in hand',
                'error'
              );
              return;
            }

            // Handle complex action cards
            if (COMPLEX_ACTIONS.includes(cardName)) {
              handleComplexAction(cardName, player.hand, state.supply);
              return;
            }

            wsService.send({ type: 'PlayCard', card: cardName });
          }
        });

        scene.events.on('card-hover-changed', (cardName: string | null) => {
      useUIStore.getState().setHoveredCard(cardName);
    });

        scene.events.on('buy-card-request', (cardName: string) => {
          const state = useGameStore.getState().gameState;
          if (!state) return;

          const lang = useUIStore.getState().language;
          const player = state.players[state.current_player];
          const cost = getCardCost(cardName);
          const supplyCount = state.supply[cardName] || 0;

          if (state.phase !== 'Buy') {
            useUIStore.getState().showToast(
              lang === 'zh' ? '只能在購買階段購買卡片' : 'Can only buy cards in Buy phase',
              'error'
            );
            return;
          }
          if (player.buys === 0) {
            useUIStore.getState().showToast(
              lang === 'zh' ? '沒有購買次數了' : 'No buys remaining',
              'error'
            );
            return;
          }
          if (player.coins < cost) {
            useUIStore.getState().showToast(
              lang === 'zh'
                ? `金幣不足！需要 ${cost}，目前只有 ${player.coins}`
                : `Not enough coins! Need ${cost}, have ${player.coins}`,
              'error'
            );
            return;
          }
          if (supplyCount === 0) {
            useUIStore.getState().showToast(
              lang === 'zh' ? '供應區已空' : 'Supply pile empty',
              'error'
            );
            return;
          }

          wsService.send({ type: 'BuyCard', card: cardName });
        });

    scene.events.on('supply-card-hover-changed', (cardName: string | null) => {
      useUIStore.getState().setHoveredCard(cardName);
    });
  };

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new PhaserGame('phaser-container');

      // Wait for scene to be ready before setting up listeners
      const checkScene = () => {
        const scene = gameRef.current?.getScene('TableScene');
        if (scene && (scene as any).hand) {
          setupSceneListeners(scene);
        } else {
          // Scene not ready yet, try again next frame
          requestAnimationFrame(checkScene);
        }
      };
      // Start checking after a short delay for Phaser to initialize
      setTimeout(checkScene, 100);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  const handleComplexAction = (
    cardName: string,
    hand: string[],
    supply: Record<string, number>
  ) => {
    const openModal = useUIStore.getState().openCardSelectionModal;

    switch (cardName) {
      case 'Cellar': {
        // Select cards from hand to discard (excluding the Cellar itself)
        const otherCards = hand.filter((c, i) => {
          if (c === 'Cellar') {
            // Only exclude the first Cellar
            const firstCellarIdx = hand.indexOf('Cellar');
            return i !== firstCellarIdx;
          }
          return true;
        });
        openModal({
          mode: 'select-hand',
          title: { zh: '選擇要棄掉的牌（可選0張以上）', en: 'Select cards to discard (0 or more)' },
          cards: otherCards,
          minSelect: 0,
          maxSelect: otherCards.length,
          onConfirm: (selected) => {
            wsService.send({ type: 'PlayCellar', cards: selected });
          },
        });
        break;
      }

      case 'Workshop': {
        // Select a card from supply costing up to 4
        const gainableCards = Object.keys(supply).filter(
          (c) => supply[c] > 0 && getCardCost(c) <= 4
        );
        openModal({
          mode: 'select-supply',
          title: { zh: '選擇一張價值不超過 4 的牌', en: 'Gain a card costing up to 4' },
          cards: gainableCards,
          minSelect: 1,
          maxSelect: 1,
          onConfirm: (selected) => {
            wsService.send({ type: 'PlayWorkshop', card: selected[0] });
          },
        });
        break;
      }

      case 'Militia': {
        // No selection needed, auto-resolves
        wsService.send({ type: 'PlayMilitia' });
        break;
      }

      case 'Mine': {
        const treasuresInHand = hand.filter((c) => TREASURES.includes(c));
        if (treasuresInHand.length === 0) {
          useUIStore.getState().showToast(
            useUIStore.getState().language === 'zh'
              ? '手牌中沒有寶物牌可以移除'
              : 'No treasure cards in hand to trash',
            'error'
          );
          return;
        }

        const uniqueTreasures = [...new Set(treasuresInHand)];
        const treasureSupply = Object.keys(supply).filter(
          (c) => TREASURES.includes(c) && supply[c] > 0
        );

        openModal({
          mode: 'trash-and-gain',
          title: { zh: '選擇要移除的寶物牌', en: 'Select a treasure to trash' },
          cards: uniqueTreasures,
          supplyCards: treasureSupply,
          maxGainCostOver: 3,
          minSelect: 1,
          maxSelect: 1,
          onConfirm: () => {},
          onTwoStep: (trash, gain) => {
            wsService.send({ type: 'PlayMine', trash, gain });
          },
        });
        break;
      }

      case 'Remodel': {
        const handWithoutRemodel = hand.filter((c, i) => {
          if (c === 'Remodel') {
            const firstIdx = hand.indexOf('Remodel');
            return i !== firstIdx;
          }
          return true;
        });

        if (handWithoutRemodel.length === 0) {
          useUIStore.getState().showToast(
            useUIStore.getState().language === 'zh'
              ? '沒有可以移除的牌'
              : 'No cards to trash',
            'error'
          );
          return;
        }

        const allSupplyCards = Object.keys(supply).filter((c) => supply[c] > 0);

        openModal({
          mode: 'trash-and-gain',
          title: { zh: '選擇要移除的牌', en: 'Select a card to trash' },
          cards: handWithoutRemodel,
          supplyCards: allSupplyCards,
          maxGainCostOver: 2,
          minSelect: 1,
          maxSelect: 1,
          onConfirm: () => {},
          onTwoStep: (trash, gain) => {
            wsService.send({ type: 'PlayRemodel', trash, gain });
          },
        });
        break;
      }
    }
  };

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
