import { useEffect } from 'react';
import { GameContainer } from './game/GameContainer';
import { wsService } from './services/websocket';

function App() {
  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onMessage((msg) => {
      console.log('Received message:', msg);
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <GameContainer />
    </div>
  );
}

export default App;
