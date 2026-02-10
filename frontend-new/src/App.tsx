import { useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { TopBar } from './components/GameUI/TopBar';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);

  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onMessage((msg) => {
      console.log('Received message:', msg);
      if (msg.type === 'GameStateUpdate' && msg.payload.game_state) {
        setGameState(msg.payload.game_state as any);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [setGameState]);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <TopBar />
      <GameContainer />
    </div>
  );
}

export default App;
