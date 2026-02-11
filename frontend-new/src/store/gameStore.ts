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

    if (state.game_over && state.scores) {
      const scores = state.scores.map(([name, score]) => ({ name, score }));
      set({ isGameOver: true, finalScores: scores });
    }
  },
}));
