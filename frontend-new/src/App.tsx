import { useEffect, useRef, useState } from 'react';
import { GameContainer } from './game/GameContainer';
import { useTableLayout } from './game/useTableLayout';
import { ActionLog } from './components/GameUI/ActionLog';
import { StatusBar } from './components/GameUI/StatusBar';
import { PlayerPanel } from './components/GameUI/PlayerPanel';
import { TrashPile } from './components/GameUI/TrashPile';
import { PlayedCards } from './components/GameUI/PlayedCards';
import { Toast } from './components/GameUI/Toast';
import { GameOverModal } from './components/GameUI/GameOverModal';
import { DecisionModal } from './components/GameUI/DecisionModal';
import { CardTooltip } from './components/GameUI/CardTooltip';
import { StartScreen } from './components/GameUI/StartScreen';
import { wsService } from './services/websocket';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';
import { translateError } from './utils/i18n';
import styles from './App.module.css';

function App() {
  const setGameState = useGameStore((state) => state.setGameState);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const finalScores = useGameStore((state) => state.finalScores);
  const winners = useGameStore((state) => state.winners);
  const players = useGameStore((state) => state.gameState?.players);
  const viewer = useGameStore((state) => state.viewer);
  const [gameStarted, setGameStarted] = useState(false);
  const tableRef = useRef<HTMLElement>(null);
  const layout = useTableLayout(tableRef);

  useEffect(() => {
    // The WebSocket connection is opened by StartScreen once options are chosen.
    const unsubscribe = wsService.onMessage((msg) => {
      if (msg.type !== 'GameStateUpdate') return;
      setGameState(msg.payload.game_state, msg.payload.viewer);
      if (msg.payload.error) {
        const { language, showToast } = useUIStore.getState();
        showToast(translateError(msg.payload.error, language), 'error');
      }
    });

    // The connection lives as long as the page; remounts (e.g. HMR) only unsubscribe.
    return unsubscribe;
  }, [setGameState]);

  const handleCloseGameOver = () => {
    useGameStore.setState({ isGameOver: false, finalScores: null });
  };

  const opponent = players ? players.findIndex((_, i) => i !== viewer) : -1;

  return (
    <div className={styles.shell}>
      {!gameStarted && <StartScreen onStart={() => setGameStarted(true)} />}

      {/* Phaser draws the Supply and hand; overlays use the same table layout. */}
      <main className={styles.table} ref={tableRef}>
        <GameContainer />
        {layout && (
          <>
            {opponent >= 0 && <PlayerPanel playerIndex={opponent} rect={layout.opponentPanel} variant="opponent" />}
            <PlayerPanel playerIndex={viewer} rect={layout.myPanel} variant="me" />
            <TrashPile rect={layout.trash} />
            <PlayedCards rect={layout.inPlay} />
            <StatusBar rect={layout.statusBar} />
          </>
        )}
      </main>
      <ActionLog />

      <CardTooltip />
      <Toast />
      <DecisionModal />
      {isGameOver && finalScores && (
        <GameOverModal scores={finalScores} winners={winners} onClose={handleCloseGameOver} />
      )}
    </div>
  );
}

export default App;
