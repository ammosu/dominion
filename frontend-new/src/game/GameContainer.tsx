import { useEffect, useRef } from 'react';
import { PhaserGame } from './PhaserGame';
import { wsService } from '../services/websocket';
import { useUIStore } from '../store/uiStore';

export function GameContainer() {
  const gameRef = useRef<PhaserGame | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new PhaserGame('phaser-container');

      // 監聽 Phaser 事件
      const scene = gameRef.current.getScene('TableScene');
      if (scene) {
        scene.events.on('play-card-request', (cardName: string) => {
          wsService.send({ type: 'PlayCard', payload: { card: cardName } });
        });

        scene.events.on('card-hover-changed', (cardName: string | null) => {
          setHoveredCard(cardName);
        });

        scene.events.on('buy-card-request', (cardName: string) => {
          console.log('Buy card request:', cardName);
          wsService.send({ type: 'BuyCard', payload: { card: cardName } });
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

  // Mock supply data for testing
  useEffect(() => {
    const scene = gameRef.current?.getScene('TableScene') as any;
    if (scene && scene.updateSupply) {
      scene.updateSupply(
        {
          Copper: 60,
          Silver: 40,
          Gold: 30,
          Estate: 12,
          Duchy: 12,
          Province: 12,
          Curse: 10,
          Smithy: 10,
          Village: 10,
          Market: 10,
        },
        {
          Copper: 0,
          Silver: 3,
          Gold: 6,
          Estate: 2,
          Duchy: 5,
          Province: 8,
          Curse: 0,
          Smithy: 4,
          Village: 3,
          Market: 5,
        }
      );
    }
  }, []);

  return <div id="phaser-container" ref={containerRef} />;
}
