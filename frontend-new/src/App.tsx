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
import { DecisionModal } from './components/GameUI/DecisionModal';
import { CardTooltip } from './components/GameUI/CardTooltip';
import { StartScreen } from './components/GameUI/StartScreen';
import { PlayersSidebar } from './components/GameUI/PlayersSidebar';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';
import { translateError } from './utils/i18n';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const finalScores = useGameStore((state) => state.finalScores);
  const winners = useGameStore((state) => state.winners);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    // WebSocket connection is now established in StartScreen after user selects AI difficulty
    const unsubscribe = wsService.onMessage((msg) => {
      if (msg.type !== 'GameStateUpdate') return;
      setGameState(msg.payload.game_state, msg.payload.viewer);
      if (msg.payload.error) {
        const { language, showToast } = useUIStore.getState();
        showToast(translateError(msg.payload.error, language), 'error');
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
      <PlayersSidebar />
      <CardTooltip />
      <Toast />
      <GameContainer />
      <DecisionModal />
      {isGameOver && finalScores && (
        <GameOverModal scores={finalScores} winners={winners} onClose={handleCloseGameOver} />
      )}
    </div>
  );
}

export default App;
