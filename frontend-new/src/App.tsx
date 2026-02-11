import { useEffect, useState } from 'react';
import { GameContainer } from './game/GameContainer';
import { TopBar } from './components/GameUI/TopBar';
import { ActionLog } from './components/GameUI/ActionLog';
import { TurnControls } from './components/GameUI/TurnControls';
import { PhaseInstructions } from './components/GameUI/PhaseInstructions';
import { DeckAreas } from './components/GameUI/DeckAreas';
import { PlayedCards } from './components/GameUI/PlayedCards';
import { Toast } from './components/GameUI/Toast';
import { GameOverModal } from './components/GameUI/GameOverModal';
import { StartScreen } from './components/GameUI/StartScreen';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const finalScores = useGameStore((state) => state.finalScores);
  const [gameStarted, setGameStarted] = useState(false);

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

  const handleCloseGameOver = () => {
    // Reset game over state when closing modal
    useGameStore.setState({ isGameOver: false, finalScores: null });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      {!gameStarted && <StartScreen onStart={() => setGameStarted(true)} />}

      <TopBar />
      <PlayedCards />
      <ActionLog />
      <TurnControls />
      <PhaseInstructions />
      <DeckAreas />
      <Toast />
      <GameContainer />
      {isGameOver && finalScores && (
        <GameOverModal scores={finalScores} onClose={handleCloseGameOver} />
      )}
    </div>
  );
}

export default App;
