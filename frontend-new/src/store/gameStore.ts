import { create } from 'zustand';
import { GameState, Player } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  currentPlayer: Player | null;
  updateCurrentPlayer: () => void;
  isGameOver: boolean;
  finalScores: { name: string; score: number }[] | null;
  checkGameOver: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  currentPlayer: null,
  isGameOver: false,
  finalScores: null,

  setGameState: (state: GameState) => {
    set({ gameState: state });
    get().updateCurrentPlayer();
    get().checkGameOver();
  },

  updateCurrentPlayer: () => {
    const state = get().gameState;
    if (state && state.players[state.current_player]) {
      set({ currentPlayer: state.players[state.current_player] });
    } else {
      set({ currentPlayer: null });
    }
  },

  checkGameOver: () => {
    const state = get().gameState;
    if (!state) return;

    // Check if Province is empty
    const provinceEmpty = state.supply['Province'] === 0;

    // Check if 3 piles are empty
    const emptyPiles = Object.values(state.supply).filter((count) => count === 0).length;

    if (provinceEmpty || emptyPiles >= 3) {
      // Calculate scores (frontend estimate)
      // TODO: Get real scores from backend
      const scores = state.players.map((player) => ({
        name: player.name,
        score: 0, // Backend should send this
      }));
      set({ isGameOver: true, finalScores: scores });
    }
  },
}));
