import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import { getAllCardCosts, getCardCost, isAction, isTreasure } from '../utils/cardData';

type Lang = 'zh' | 'en';

function toast(message: Record<Lang, string>) {
  const { language, showToast } = useUIStore.getState();
  showToast(message[language], 'error');
}

/** Client-side checks are for quick feedback only; the server is authoritative. */
function requestPlayCard(cardName: string) {
  const { gameState: state, viewerPlayer: me, canAct, myDecision } = useGameStore.getState();
  if (!state || !me) return;

  if (myDecision) {
    toast({ zh: '請先完成目前的選擇', en: 'Finish the current choice first' });
    return;
  }
  if (!canAct) {
    toast({ zh: '還沒輪到你', en: "It's not your turn" });
    return;
  }

  if (isTreasure(cardName)) {
    if (state.phase !== 'Buy') {
      toast({ zh: '只能在購買階段打出寶物卡', en: 'Can only play treasures in Buy phase' });
      return;
    }
    if (state.turn.has_bought) {
      toast({ zh: '購買後就不能再打出寶物牌', en: 'Cannot play Treasures after buying' });
      return;
    }
    wsService.send({ type: 'PlayTreasure', card: cardName });
    return;
  }

  if (!isAction(cardName)) {
    toast({ zh: '這張牌不能打出', en: 'This card cannot be played' });
    return;
  }
  if (state.phase !== 'Action') {
    toast({ zh: '只能在行動階段打出行動卡', en: 'Can only play actions in Action phase' });
    return;
  }
  if (me.actions === 0) {
    toast({ zh: '沒有行動次數了', en: 'No actions remaining' });
    return;
  }
  wsService.send({ type: 'PlayCard', card: cardName });
}

/** Why `cardName` cannot be bought right now, or null if it can. */
export function buyBlocker(cardName: string): Record<Lang, string> | null {
  const { gameState: state, viewerPlayer: me, canAct } = useGameStore.getState();
  if (!state || !me) return { zh: '遊戲尚未開始', en: 'The game has not started' };

  const cost = getCardCost(cardName);
  if (!canAct || state.phase !== 'Buy') {
    return { zh: '只能在自己的購買階段購買卡片', en: 'Can only buy cards in your Buy phase' };
  }
  if (me.buys === 0) {
    return { zh: '沒有購買次數了', en: 'No buys remaining' };
  }
  if (me.coins < cost) {
    return {
      zh: `金幣不足！需要 ${cost}，目前只有 ${me.coins}`,
      en: `Not enough coins! Need ${cost}, have ${me.coins}`,
    };
  }
  if ((state.supply[cardName] ?? 0) === 0) {
    return { zh: '供應區已空', en: 'Supply pile empty' };
  }
  return null;
}

export function requestBuyCard(cardName: string) {
  const blocker = buyBlocker(cardName);
  if (blocker) {
    toast(blocker);
    return;
  }
  wsService.send({ type: 'BuyCard', card: cardName });
}

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameState = useGameStore((state) => state.gameState);
  const viewerHand = useGameStore((state) => state.viewerPlayer?.hand);
  const me = useGameStore((state) => state.viewerPlayer);
  const canAct = useGameStore((state) => state.canAct);
  const language = useUIStore((state) => state.language);
  const artStyle = useUIStore((state) => state.artStyle);

  const setupSceneListeners = (scene: Phaser.Scene) => {
    // Remove any existing listeners first to avoid duplicates
    scene.events.off('play-card-request');
    scene.events.off('card-hover-changed');
    scene.events.off('buy-card-request');
    scene.events.off('supply-card-hover-changed');
    scene.events.off('supply-card-inspect');

    scene.events.on('play-card-request', requestPlayCard);
    scene.events.on('buy-card-request', requestBuyCard);
    scene.events.on('card-hover-changed', (cardName: string | null) => {
      useUIStore.getState().setHoveredCard(cardName);
    });
    scene.events.on('supply-card-hover-changed', (cardName: string | null) => {
      useUIStore.getState().setHoveredCard(cardName);
    });
    scene.events.on('supply-card-inspect', (cardName: string) => {
      useUIStore.getState().setInspectedCard(cardName);
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
          // State may have arrived before the scene was ready.
          syncScene(scene as any);
        } else {
          requestAnimationFrame(checkScene);
        }
      };
      setTimeout(checkScene, 100);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  const syncScene = (scene: any) => {
    const { gameState: state, viewerPlayer } = useGameStore.getState();
    if (!state) return;
    scene.updateLanguage?.(useUIStore.getState().language);
    scene.updateSupply?.(state.supply, getAllCardCosts(state.supply), state.kingdom);
    if (viewerPlayer) scene.updateHand?.(viewerPlayer.hand);
  };

  // Sync supply with game state
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateSupply && gameState?.supply) {
      scene.updateSupply(gameState.supply, getAllCardCosts(gameState.supply), gameState.kingdom);
    }
  }, [gameState?.supply, gameState?.kingdom]);

  // Sync our own hand (not the current player's: we may be answering an attack)
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateHand && viewerHand) {
      scene.updateHand(viewerHand);
    }
  }, [viewerHand]);

  // Outline what can be played / bought right now
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (!scene?.setHighlights || !gameState || !me) return;
    let buyable: string[] = [];
    let playable: string[] = [];
    if (canAct && gameState.phase === 'Action' && me.actions > 0) {
      playable = me.hand.filter(isAction);
    }
    if (canAct && gameState.phase === 'Buy') {
      if (!gameState.turn.has_bought) playable = me.hand.filter(isTreasure);
      if (me.buys > 0) {
        buyable = Object.keys(gameState.supply).filter(
          (card) => gameState.supply[card] > 0 && getCardCost(card) <= me.coins,
        );
      }
    }
    scene.setHighlights(buyable, playable);
  }, [gameState, me, canAct]);

  // Swap card artwork sets
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    scene?.setArtStyle?.(artStyle);
  }, [artStyle]);

  // Update language for all visible cards
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateLanguage) {
      scene.updateLanguage(language);
    }
  }, [language]);

  return <div id="phaser-container" ref={containerRef} />;
}
