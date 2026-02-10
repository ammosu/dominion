import { create } from 'zustand';
import { GameState, Player } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  currentPlayer: Player | null;
  updateCurrentPlayer: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  currentPlayer: null,

  setGameState: (state: GameState) => {
    set({ gameState: state });
    get().updateCurrentPlayer();
  },

  updateCurrentPlayer: () => {
    const state = get().gameState;
    if (state && state.players[state.current_player]) {
      set({ currentPlayer: state.players[state.current_player] });
    } else {
      set({ currentPlayer: null });
    }
  },
}));
